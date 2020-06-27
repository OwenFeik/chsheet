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
        let node_title = node.querySelector(".header").querySelector(".title");
        let node_content = node.querySelector(".content");

        let node_info = {
            title: node_title.innerText,
            type: node.type,
            width: node.width,
            height: node.height,
            x: parseInt(node.style.gridColumnStart, 10),
            y: parseInt(node.style.gridRowStart, 10),
            controls_active: !node.classList.contains("controls_inactive"),
            font_size: parseInt(node_content.style.font_size, 10),
            locked: node.classList.contains("locked"),
            content: node_content.innerText
        }

        node_store.add(node_info);
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
            let node = create_node(
                cursor.value.width, 
                cursor.value.height, 
                cursor.value.type
            );

            let header = node.querySelector(".header");
            let title = header.querySelector(".title");
            let content = node.querySelector(".content");

            title.innerText = cursor.value.innerText;

            if (!cursor.value.controls_active) {
                node.classList.add("controls_inactive");
            }

            content.style.fontSize = cursor.value.font_size + "pt";

            if (cursor.value.locked) {
                node.classList.add("locked");
            }

            content.innerText = cursor.value.content;
            sheet.appendChild(node);

            snap_to_grid(node, cursor.value.x, cursor.value.y);

            cursor.continue();
        }
    };
}
