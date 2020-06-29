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

        let node_store = db.createObjectStore(
            "nodes", 
            { keyPath: "id", autoIncrement: true }
        );

        node_store.createIndex("title", "title");
        node_store.createIndex("type", "type");
        node_store.createIndex("width", "width");
        node_store.createIndex("height", "height");
        node_store.createIndex("x", "x");
        node_store.createIndex("y", "y");
        node_store.createIndex("controls_active", "controls_active");
        node_store.createIndex("font_size", "font_size");
        node_store.createIndex("locked", "locked");
        node_store.createIndex("content", "content");
    };
}

function save_sheet(sheet) {
    let transaction = db.transaction('nodes', 'readwrite');
    let node_store = transaction.objectStore('nodes');
    node_store.clear();

    sheet.querySelectorAll(".node").forEach(node => {
        node_store.add(node_to_dict(node));
    });

    transaction.oncomplete = function () {
    };

    transaction.onerror = function () {
    };
}

function load_sheet(sheet) {
    sheet.querySelectorAll(".node").forEach(node => {
        node.remove();
    });

    let node_store = db.transaction('nodes').objectStore('nodes');
    node_store.openCursor().onsuccess = function (e) {
        let cursor = e.target.result;

        if (cursor) {
            let node = node_from_dict(cursor.value);
            sheet.appendChild(node);
            snap_to_grid(node, cursor.value.x, cursor.value.y);
            cursor.continue();
        }
    };
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
        font_size: parseInt(node_content.style.font_size, 10),
        locked: node.classList.contains("locked"),
    }

    if (node.type === "text" || node.type === "number") {
        node_info.content = node_content.innerText;
    }
    else if (node.type === "list") {
        let list_items = [];
        node_content.querySelectorAll(".list_item").forEach(i => {
            list_items.push(i.querySelector(".list_item_content").innerText);
        });
        
        node_info.content = list_items;
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

    if (dict.type == "text" || dict.type == "number") {
        content.innerText = dict.content;
    }
    else if (dict.type == "list") {
        dict.content.forEach(i => {
            content.appendChild(create_list_item(i));
        });
    }

    update_editable(node);

    return node;
}
