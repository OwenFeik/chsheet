var db;

function set_up_db(callback = null) {
    let request = window.indexedDB.open("sheet_db", 1);

    request.onerror = function () {
        console.error("Failed to open database.");
    };

    request.onsuccess = function () {
        db = request.result;
        
        if (callback) {
            callback();
        } 
    };

    request.onupgradeneeded = function (e) {
        db = e.target.result;

        let sheet_store = db.createObjectStore(
            "sheets",
            { keyPath: "title" }
        );


        /*
        Actual data of the sheet, JSON with structure
        {
            nodes: [],
            groups: []
        }
        */
        sheet_store.createIndex("data", "data");

        // Unique identifying code of the sheet on the server
        sheet_store.createIndex("code", "code");

        // Time at which this sheet was downloaded from the server
        sheet_store.createIndex("time", "time");

        // Time of most recent update to this sheet
        sheet_store.createIndex("updated", "updated");

        let blob_store = db.createObjectStore(
            "blobs",
            { keyPath: "title" }
        );
        blob_store.createIndex("blob", "blob");
    };
}

function save_sheet(sheet, callback = null) {
    insert_to_db(sheet.to_json(), callback);    
}

function load_sheet(title, callback) {
    get_sheet_from_db(title, data => {
        callback(data);
    });
}

function sheet_exists_in_db(title, callback) {
    let sheet_store = db.transaction("sheets").objectStore("sheets");
    let request = sheet_store.count(title);

    request.onsuccess = function (count) {
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
        console.error("Database error in get_all_sheets.");
    }
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

function delete_sheet(title, callback = null) {
    let store = db.transaction("sheets", "readwrite").objectStore("sheets");
    let request = store.delete(title);

    request.onsuccess = function () {
        if (callback !== null) {
            callback();
        }
    };
}

function delete_sheets(titles, callback = null) {
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

function delete_cloud_saves(callback = null) {
    get_all_sheets(sheets => {
        delete_sheets(
            sheets.filter(
                sheet => Boolean(sheet.code)
            ).map(sheet => sheet.title),
            callback
        );
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

function insert_to_db(sheet_obj, callback = null) {
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
        if (e.target.result) {
            doWithImage(window.URL.createObjectURL(e.target.result.blob));
        }
        else {
            doWithImage(null);
        }
    };
}

function insert_blob(blob_obj, callback = null) {
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

function upload_sheet(file, callback = null) {
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
                    console.error("Failed to load save from disk.");
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
