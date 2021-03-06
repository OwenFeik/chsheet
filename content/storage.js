var db;

function set_up_db() {
    let request = window.indexedDB.open("sheet_db", 1);

    request.onerror = function () {
        console.log("Failed to open database.");
    };

    request.onsuccess = function () {
        db = request.result; 
        document.getElementById("save_menu").reload_saves();
    };

    request.onupgradeneeded = function (e) {
        db = e.target.result;

        let sheet_store = db.createObjectStore(
            "sheets",
            { keyPath: "title" }
        );

        sheet_store.createIndex("time", "time");
        sheet_store.createIndex("data", "data");

        let blob_store = db.createObjectStore(
            "blobs",
            { keyPath: "title" }
        );
        blob_store.createIndex("blob", "blob");
    };
}

function save_sheet(title=null, callback=null) {
    let nodes = [];
    sheet.querySelectorAll(".node").forEach(node => {
        nodes.push(node_to_dict(node));
    });

    let groups = [];
    sheet.querySelectorAll(".node_group").forEach( g => {
        groups.push({
            width: g.width,
            height: g.height,
            x: parseInt(g.style.gridColumnStart),
            y: parseInt(g.style.gridRowStart)
        })
    });
    
    insert_to_db({
        title: title,
        time: new Date().getTime(),
        data: {
            nodes: nodes,
            groups: groups
        }
    }, callback);    
}

function load_sheet(title, callback) {
    get_sheet_from_db(title, data => {
        build_sheet(data);
        callback();
    });
}

function sheet_exists_in_db(title, callback) {
    let sheet_store = db.transaction("sheets").objectStore("sheets");
    let request = sheet_store.count(title);

    request.onsuccess = function (count) {
        console.log(request.result);
        if (request.result > 0) {
            callback(true);
        }
        else {
            callback(false);
        }
    };
}

function get_sheet_from_db(title, callback) {
    let sheet_store = db.transaction("sheets").objectStore("sheets");
    let request = sheet_store.get(title);

    request.onsuccess = function (e) {
        callback(e.target.result);
    };

    request.onerror = function (e) {
    };
}

function get_all_sheets(callback) {
    let sheet_store = db.transaction("sheets").objectStore("sheets");
    let request = sheet_store.getAll();

    request.onsuccess = function (e) {
        callback(e.target.result);
    };

    request.onerror = function (e) {
        console.log("error!");
    }
}

function node_to_dict(node) {
    let node_title = node.querySelector(".header").querySelector(".title");
    let node_content = node.querySelector(".content");
    
    let node_info = {
        title: node_title.innerText,
        title_active: node_title.style.display !== "none",
        type: node.type,
        width: node.width,
        height: node.height,
        x: parseInt(node.style.gridColumnStart, 10),
        y: parseInt(node.style.gridRowStart, 10),
        controls_active: !node.classList.contains("controls_inactive"),
        font_size: parseInt(node_content.style.fontSize),
        text_align: node_content.style.textAlign,
        locked: node.classList.contains("locked")
    }

    if (node.type === "text") {
        node_info.content = node_content.innerText;
    }
    else if (node.type === "number") {
        node_info.content = node_content.innerText.replace(/\n/g, "");
        node_info.default_value = node_content.default_value;
        node_info.has_default = node.classList.contains("has_default");
    }
    else if (node.type === "list") {
        let list_items = [];
        Array.prototype.slice.call(node_content.children).sort((a, b) =>
            (a.style.order - b.style.order)
        ).forEach(i => {
            if (i.classList.contains("list_break")) {
                list_items.push({
                    type: "break",
                    title: i.querySelector(".title").innerText
                });
            }
            else {
                list_items.push({
                    type: "item",
                    content: i.querySelector(".list_item_content").innerText,
                    checkbox_checked: i.querySelector(".checkbox")
                        .classList.contains("checked")
                });
            }
        });
        
        node_info.content = {
            items: list_items,
            checkboxes_active: 
                node_content.classList.contains("checkboxes_active"),
        };
    }
    else if (node.type === "die") {
        node_info.content = {
            die_size: node.die_size
        }
    }
    else if (node.type === "image") {
        let image = node_content.querySelector("img");
        let isLocal = image.src.startsWith("blob:null/");

        // For a local image, uri is the name it is saved under in db
        // for an external image it is the actual uri of the image.

        node_info.content = {
            uri: isLocal ? image.image_name : image.src,
            blob: isLocal,
            crop: image.objectFit ? image.objectFit : "cover"
        };

        if (isLocal) {
            save_image(image.image_name, image.src);
        }
    }
    else if (node.type === "checkbox") {
        node_info.content = {
            checked: node_content.querySelector(".checkbox")
                .classList.contains("checked")
        };
    }

    return node_info;
}

function node_from_dict(dict) {
    let node = create_node(
        dict.width, 
        dict.height, 
        dict.type
    );

    let header = node.querySelector(".header");
    let title = header.querySelector(".title");
    let content = node.querySelector(".content");

    header.style.minHeight
        = dict.title_active ? `${NODE_HEADER_HEIGHT}px` : "0px";

    title.innerText = dict.title;
    title.style.display = dict.title_active ? "inline" : "none";

    if (!dict.controls_active) {
        node.classList.add("controls_inactive");
    }

    content.style.fontSize = dict.font_size + "pt";
    content.style.textAlign = dict.text_align;

    if (dict.locked) {
        node.classList.add("locked");
    }

    if (dict.type === "text") {
        content.innerText = dict.content;
    }
    else if (dict.type === "number") {
        content.innerText = dict.content;
        content.default_value = dict.default_value;
        if (dict.has_default) {
            node.classList.add("has_default");
        }
    }
    else if (dict.type === "list") {
        if (dict.content.checkboxes_active) {
            content.classList.add("checkboxes_active");
        }

        dict.content.items.forEach(i => {
            let new_item;
            
            if (i.type === "break") {
                new_item = create_list_break(i.title)
            }
            else {
                // old save files have no breaks and no type fields
                // this allows them to still be loaded

                new_item = create_list_item(i.content);
                let checkbox = new_item.querySelector(".checkbox");
                checkbox.value = i.checkbox_checked;
                if (!checkbox.value) {
                    checkbox.classList.remove("checked");
                }
            }

            new_item.style.order = content.children.length;
            content.appendChild(new_item);
        });
    }
    else if (dict.type === "die") {
        node.die_size = dict.content.die_size;
    }
    else if (dict.type === "image") {
        let image = content.querySelector("img");

        image.style.objectFit = dict.content.crop;

        if (!dict.content.blob) {
            image.src = dict.content.uri;
        }
        else {
            load_image(dict.content.uri, uri => {
                image.image_name = dict.content.uri;
                image.src = uri;
            });
        }
    }
    else if (dict.type === "checkbox") {
        let checkbox = content.querySelector(".checkbox");
        if (checkbox.classList.contains("checked")) {
            checkbox.classList.remove("checked");
        }
        if (dict.content.checked) {
            checkbox.classList.add("checked");
        }
    }

    update_editable(node);

    return node;
}

function build_sheet(save) {
    sheet.querySelectorAll(".node").forEach(n => n.remove());
    sheet.querySelectorAll(".node_group").forEach(g => g.remove());
    sheet.save_title = save.title;
    sheet.resize(Math.max.apply(
        null,
        get_nodes(save).map((n) => n.x + n.width)
    ));


    if (Array.isArray(save.data)) {
        nodes = save.data;
    }
    else {
        nodes = save.data.nodes;
        save.data.groups.forEach(
            g => create_node_group(null, g.x, g.y, g.width, g.height)
        );
    }

    nodes.forEach(n => {
        let node = node_from_dict(n);
        sheet.appendChild(node);
        snap_to_grid(node, n.x, n.y);
    });    

    set_document_title(save.title);
}

function download_sheet(title) {
    get_sheet_from_db(title, save => {
        let blob = new Blob(
            [JSON.stringify(save.data)], 
            {type: "text/plain"}
        );

        let a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${title}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);    
    });
}

function delete_sheet(title, callback=null) {
    let store = db.transaction("sheets", "readwrite").objectStore("sheets");
    let request = store.delete(title);

    request.onsuccess = function () {
        if (callback !== null) {
            callback();
        }
    };
}

function delete_sheets(titles, callback=null) {
    let transaction = db.transaction("sheets", "readwrite");
    let sheet_store = transaction.objectStore("sheets");

    transaction.oncomplete = function () {
        if (callback !== null) {
            callback();
        }
    };

    titles.forEach(title => {
        sheet_store.delete(title);
    });
}

// iterates across all saves, noting which images are in use
// then deletes images not used in any saves, and returns a list
// of reserved image names. 
function update_image_store(all_sheets) {
    let image_names = [];

    all_sheets.forEach(s => {
        get_nodes(s).forEach(n => {
            if (n.type === "image" && n.content.blob) {
                if (image_names.indexOf(n.content.uri) < 0) {
                    image_names.push(n.content.uri);
                }
            }
        });
    });

    let transaction = db.transaction("blobs", "readwrite");
    let blob_store = transaction.objectStore("blobs");
    let cursor_request = blob_store.openCursor();

    cursor_request.onsuccess = function (e) {
        let cursor = e.target.result;
        
        if (cursor) {
            if (image_names.indexOf(cursor.value.title) < 0) {
                blob_store.delete(cursor.value.title);
            }

            cursor.continue();
        }
    };

    return image_names;
}

function insert_to_db(sheet_obj, callback=null) {
    let transaction = db.transaction("sheets", "readwrite");
    let sheet_store = transaction.objectStore("sheets");

    transaction.oncomplete = function () {
        if (callback !== null) {
            callback();
        }
        return true;
    };

    transaction.onerror = function () {
        return false;
    };

    sheet_store.put(sheet_obj);
}

async function save_image(image_name, local_uri) {
    insert_blob({
        title: image_name,
        blob: await fetch(local_uri).then(r => r.blob())
    });
}

async function load_image(image_name, doWithImage) {
    let transaction = db.transaction("blobs", "readonly");
    let blob_store = transaction.objectStore("blobs");

    let request = blob_store.get(image_name);

    request.onsuccess = function (e) {
        doWithImage(window.URL.createObjectURL(e.target.result.blob));
    };
}

function insert_blob(blob_obj, callback=null) {
    let transaction = db.transaction("blobs", "readwrite");
    let blob_store = transaction.objectStore("blobs");

    transaction.oncomplete = function () {
        if (callback !== null) {
            callback();
        }
        return true;
    };

    transaction.onerror = function () {
        return false;
    };

    blob_store.put(blob_obj);
}

function upload_sheet(file, callback=null) {
    let file_reader = new FileReader();
    file_reader.onload = function (e) {
        let title = file.name.slice(0, -1 * ".json".length);
        sheet_exists_in_db(title, exists => {
            if (
                !exists
                || confirm(`Save "${title}" already exists. Replace?`)
            ) {
                try {
                    insert_to_db({
                        title: title,
                        time: file.lastModified,
                        data: JSON.parse(e.target.result)
                    }, callback);
                }
                catch {
                    console.log("Failed to read.");
                }        
            }
        });
    };
    
    file_reader.readAsText(file, "UTF-8");
}

function get_nodes(save) {
    if (Array.isArray(save.data)) {
        return save.data;
    }
    return save.data.nodes;
}
