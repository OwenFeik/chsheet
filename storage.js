var db;

function set_up_db() {
    let request = window.indexedDB.open("sheet_db", 1);

    request.onerror = function () {
        console.log("Failed to open database.");
    };

    request.onsuccess = function () {
       db = request.result; 
    };

    request.onupgradeneeded = function (e) {
        db = e.target.result;

        let sheet_store = db.createObjectStore(
            "sheets",
            { keyPath: "title" }
        );

        sheet_store.createIndex("time", "time");
        sheet_store.createIndex("data", "data");
    };
}

function save_sheet(sheet, title=null, callback=null) {
    let sheet_data = [];
    sheet.querySelectorAll(".node").forEach(node => {
        sheet_data.push(node_to_dict(node));
    });
    
    insert_to_db({
        title: title,
        time: new Date().getTime(),
        data: sheet_data
    }, callback);    
}

function load_sheet(sheet, title, callback) {
    get_sheet_from_db(title, data => {
        build_sheet(sheet, data);
        callback();
    });
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
        locked: node.classList.contains("locked")
    }

    if (node.type === "text" || node.type === "number") {
        node_info.content = node_content.innerText;
    }
    else if (node.type === "list") {
        let list_items = [];
        node_content.querySelectorAll(".list_item").forEach(i => {
            list_items.push({
                content: i.querySelector(".list_item_content").innerText,
                checkbox_checked: i.querySelector(".checkbox")
                    .classList.contains("checked")
            });
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

    title.innerText = dict.title;
    title.style.display = dict.title_active ? "inline" : "none";

    if (!dict.controls_active) {
        node.classList.add("controls_inactive");
    }

    content.style.fontSize = dict.font_size + "pt";

    if (dict.locked) {
        node.classList.add("locked");
    }

    if (dict.type === "text" || dict.type === "number") {
        content.innerText = dict.content;
    }
    else if (dict.type === "list") {
        if (dict.content.checkboxes_active) {
            content.classList.add("checkboxes_active");
        }

        dict.content.items.forEach(i => {
            let list_item = create_list_item(i.content);
            let checkbox = list_item.querySelector(".checkbox");
            checkbox.value = i.checkbox_checked;
            if (!checkbox.value) {
                checkbox.classList.remove("checked");
            }

            content.appendChild(list_item);
        });
    }
    else if (dict.type === "die") {
        node.die_size = dict.content.die_size;
    }

    update_editable(node);

    return node;
}

function build_sheet(sheet, save) {
    sheet.innerHTML = "";
    sheet.title = save.title;
    save.data.forEach(n => {
        let node = node_from_dict(n);
        sheet.appendChild(node);
        snap_to_grid(node, n.x, n.y);
    });
}

function download_sheet(title) {
    get_sheet_from_db(title, sheet => {
        let blob = new Blob([JSON.stringify(sheet.data)], {type: "text/plain"});

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
    }

    request.onerror = function () {
    }
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

function insert_to_db(sheet_obj, callback=null) {
    let transaction = db.transaction("sheets", "readwrite");
    let sheet_store = transaction.objectStore("sheets");

    transaction.oncomplete = function () {
        if (callback !== null) {
            callback();
        }
        return true;
    }

    transaction.onerror = function () {
        return false;
    }

    sheet_store.put(sheet_obj);
}

function upload_sheet(file, callback=null) {
    let file_reader = new FileReader();
    file_reader.onload = function (e) {
        try {
            insert_to_db({
                title: file.name.slice(0, -1 * ".json".length),
                time: file.lastModified,
                data: JSON.parse(e.target.result)
            }, callback);
        }
        catch {
            console.log("Failed to read.");
        }
    }
    
    file_reader.readAsText(file, "UTF-8");
}
