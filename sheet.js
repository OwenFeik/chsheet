const NODESIZE = 50;
const GAP = 10; 

function set_up_sheet() {    
    let sheet = document.getElementById("sheet");

    let node_qty = Math.floor(sheet.offsetWidth / (NODESIZE + GAP));
    sheet.style.width = node_qty * (NODESIZE + GAP) - GAP + "px";
    sheet.width = node_qty;
    sheet.style.gridGap = GAP + "px";
    let columnstring = (NODESIZE + "px ").repeat(node_qty).slice(0, -1);
    sheet.style.gridTemplateColumns = columnstring;
    sheet.style.gridTemplateRows = (NODESIZE + "px ").repeat(10).slice(0, -1);

    
    create_node(1, 2);    
    create_node(2, 1);
    create_node(1, 1);
    create_node(2, 2);
}

function set_up_toolbar() {
    let add = document.createElement("button");
    add.classList.add("tool");
    
    let img = document.createElement("img");
    img.src = icon_path("add.png");
    add.appendChild(img);

    add.onclick = add_node_to_sheet;

    document.getElementById("toolbar").appendChild(add);
}

function create_node(w, h) {
    let node = document.createElement("div");
    node.classList.add("node");
    node.style.width = `${node_size(w)}px`;
    node.style.height = `${node_size(h)}px`;
    node.width = w;
    node.height = h;

    let header = document.createElement("div");
    header.classList.add("header");
    node.appendChild(header);

    let title = document.createElement("span");
    title.classList.add("title");
    title.innerHTML = "Title";
    header.appendChild(title);

    let handle = document.createElement("img");
    handle.classList.add("handle", "icon");
    handle.src = icon_path("handle.png");
    header.appendChild(handle);

    let content = document.createElement("div");
    content.classList.add("content");
    content.innerHTML = "Lorem ipsum dolor sit amet";
    content.contentEditable = true;
    content.spellcheck = false;
    node.appendChild(content);


    make_node_draggable(node);

    node.oncontextmenu = function (e) {
        e.preventDefault();
        node_menu(node);
    };

    document.getElementById("sheet").appendChild(node);
    snap_to_grid(node);
}

function node_size(k) {
    return k * NODESIZE + (k - 1) * GAP;    
}

function node_menu(node) {
    let menu = node.querySelector(".menu");
    if (!menu) {
        menu = create_menu(node);
    }
    else {
        menu.style.visibility = "visible";
    }

    let click_off_menu = function (e) {
        if (
            e.target == menu ||
            e.target.classList.contains("menuitem") ||
            e.target.parentNode.classList.contains("menuitem")
        ) {
            return;
        }
        menu.close();
    };

    close_menu = function () {
        menu.style.visibility = "hidden";
        window.removeEventListener("click", click_off_menu);
    };

    menu.close = close_menu;

    window.addEventListener("click", click_off_menu);
}

function create_menu(node) {
    let menu = document.createElement("div");
    menu.classList.add("menu");
    node.appendChild(menu);

    let unlock = create_menu_item("Unlock", "unlock.png");
    let lock = create_menu_item("Lock", "lock.png");

    toggle_locked = function (e) {
        if (node.classList.contains("locked")) {
            node.classList.remove("locked");
            menu.replaceChild(lock, unlock);
        }
        else {
            node.classList.add("locked");
            menu.replaceChild(unlock, lock);
        }
    }

    unlock.onclick = toggle_locked;
    lock.onclick = toggle_locked;

    if (node.classList.contains("locked")) {
        menu.appendChild(unlock); 
    }
    else {
        menu.appendChild(lock);
    }

    let settings = create_menu_item("Settings", "cog.png");
    settings.onclick = function () {
        node_settings(node);
        menu.close();
    }

    menu.appendChild(settings);
    menu.appendChild(create_resize_menu_item());
    
    return menu;
}

function node_settings(node) {
    let settings = node.querySelector(".settings"); 
    if (!settings) {
        settings = create_settings(node); 
    }

    click_off_settings = function (e) {
        if (e.target == settings || settings.contains(e.target)) {
            return;
        }
        settings.style.visibility = "hidden";
        window.removeEventListener("mousedown", click_off_settings);
    };
    window.addEventListener("mousedown", click_off_settings);

    settings.style.visibility = "visible";
}

function create_settings(node) {
    let settings = document.createElement("div");
    settings.classList.add("settings");

    let title = document.createElement("div");
    title.classList.add("setting");
    settings.appendChild(title);

    let node_title = node.querySelector(".header").querySelector(".title");

    let title_label = document.createElement("span");
    title_label.classList.add("label");
    title_label.innerHTML = "Title";
    title.appendChild(title_label);

    let title_input = document.createElement("input");
    title_input.oninput = function () {
        node_title.innerHTML = title_input.value;
    };
    title.appendChild(title_input);

    let title_active = document.createElement("input");
    title_active.type = "checkbox";
    title_active.checked = node_title.style.display !== "none";
    title_active.oninput = function () {
        node_title.style.display 
            = title_active.checked ? "inline" : "none";
    }
    title.appendChild(title_active);

    let dimensions = document.createElement("div");
    dimensions.classList.add("setting");
    settings.appendChild(dimensions);

    let width_label = document.createElement("span");
    width_label.classList.add("label");
    width_label.innerHTML = "Width";
    dimensions.appendChild(width_label);

    let width_input = document.createElement("input");
    width_input.type = "number";
    width_input.value = node.width.toString();
    width_input.oninput = function () {
        let new_width = parseInt(width_input.value, 10);
        new_width = Math.min(new_width, node.parentNode.width);
        if (new_width > 0) /* NaN > 0 === false */ {
            node.width = new_width;
            node.style.width = node_size(new_width) + "px";
            snap_to_grid(node);
        }
    };
    dimensions.appendChild(width_input);

    let height_label = document.createElement("span");
    height_label.classList.add("label");
    height_label.innerHTML = "Height";
    dimensions.appendChild(height_label);

    let height_input = document.createElement("input");
    height_input.type = "number";
    height_input.value = node.height.toString();
    height_input.oninput = function () {
        let new_height = parseInt(height_input.value, 10);
        if (new_height > 0) /* NaN > 0 === false */ {
            node.height = new_height;
            node.style.height = node_size(new_height) + "px";
            snap_to_grid(node);
        }
    };
    dimensions.appendChild(height_input);

    let type = document.createElement("div");
    type.classList.add("setting");
    settings.appendChild(type);

    let type_label = document.createElement("span");
    type_label.classList.add("label");
    type_label.innerHTML = "Type";
    type.appendChild(type_label);

    let type_dropdown = document.createElement("select");
    [ "Text" ].forEach(t => {
        let option = document.createElement("option");
        option.innerHTML = t;
        type_dropdown.appendChild(option);
    });
    type.appendChild(type_dropdown);

    node.appendChild(settings);

    return settings;
}

function create_menu_item(label, image) {
    let item = document.createElement("div");
    item.classList.add("menuitem");

    let img = document.createElement("img");
    img.classList.add("icon");
    img.src = icon_path(image);
    item.appendChild(img);

    let text = document.createElement("span");
    text.classList.add("label");
    text.innerHTML = label;
    item.appendChild(text);

    return item;
}

function create_resize_menu_item() {
    resize_node = function (node) {
        let ghost = document.createElement("div");
        ghost.classList.add("node_ghost");
        node.appendChild(ghost);
        ghost.width = node.width;
        ghost.height = node.height;
        ghost.style.width = parseInt(node.style.width, 10) + 4 + "px";
        ghost.style.height = parseInt(node.style.height, 10) + 4 + "px";

        let bottom = document.createElement("div");
        bottom.classList.add("resize_handle", "bottom");
        make_resize_handle_draggable(bottom, node);
        node.appendChild(bottom);
    
        let right = document.createElement("div");
        right.classList.add("resize_handle", "right");
        make_resize_handle_draggable(right, node);
        node.appendChild(right);
    }

    end_resize = function (node) {
        node.querySelector(".node_ghost").remove();
        node.querySelector(".resize_handle.bottom").remove();
        node.querySelector(".resize_handle.right").remove();
        resize_to_grid(node);
        snap_to_grid(node);
    }

    let resize = create_menu_item("Resize", "resize.png");
    resize.resizing = false;
    resize.onclick = function () {
        resize.parentNode.close();
        let label = resize.querySelector(".label");
        if (resize.resizing) {
            end_resize(resize.parentNode.parentNode);
            label.innerHTML = "Resize";
        }
        else {
            resize_node(resize.parentNode.parentNode);
            label.innerHTML = "Finish";
        }
        resize.resizing = !resize.resizing;
    };

    return resize;
}

function make_resize_handle_draggable(el, node) {
    let v1 = 0, v2 = 0;
    let x_direction = el.classList.contains("left") 
        || el.classList.contains("right");
    let ghost = node.querySelector(".node_ghost");

    el.onmousedown = start_drag;

    function start_drag(e) {
        e.preventDefault();

        let top = el.offsetTop;
        let left = el.offsetLeft;

        el.style.position = "absolute";
        el.style.top = top + "px";
        el.style.left = left + "px";
        el.style.width = node_size(el.width) + "px";
        el.style.height = node_size(el.height) + "px";

        v2 = x_direction ? e.clientX : e.clienty;
        
        document.onmouseup = end_drag;
        document.onmousemove = drag;
    }

    function drag(e) {
        e.preventDefault();

        v1 = v2 - (x_direction ? e.clientX : e.clientY);
        v2 = x_direction ? e.clientX : e.clientY;

        if (x_direction) {
            el.style.left = (el.offsetLeft - v1) + "px";
            let new_width = 
                Math.max(parseInt(node.style.width, 10) - v1, NODESIZE);
            node.style.width = new_width + "px";
            ghost.style.width = new_width + 4 + "px";
            resize_to_grid(ghost, true, false);
            ghost.style.width = parseInt(ghost.style.width, 10) + 4 + "px";
        }
        else {
            el.style.top = (el.offsetTop - v1) + "px";
            let new_height = 
                Math.max(parseInt(node.style.height, 10) - v1, NODESIZE);
            node.style.height = new_height + "px";
            ghost.style.height = new_height + 4 + "px";
            resize_to_grid(ghost, false, true);
            ghost.style.height = parseInt(ghost.style.height, 10) + 4 + "px";
        }
    }

    function end_drag() {
        document.onmouseup = null;
        document.onmousemove = null;

        el.style.top = "";
        el.style.left = "";

        resize_to_grid(node);
        snap_to_grid(node);
        ghost.style.width = parseInt(node.style.width, 10) + 4 + "px";
        ghost.style.height = parseInt(node.style.height, 10) + 4 + "px";
    }
}

function resize_to_grid(el, x=true, y=true) {
    if (x) {
        let current_width = parseInt(el.style.width, 10);
        el.width = Math.max(Math.round(current_width / (NODESIZE + GAP)), 1);
        el.style.width = node_size(el.width) + "px";    
    }

    if (y) {
        let current_height = parseInt(el.style.height, 10);
        el.height = Math.max(Math.round(current_height / (NODESIZE + GAP)), 1);
        el.style.height = node_size(el.height) + "px";    
    }
}

function add_node_to_sheet(e) {
    create_node(1, 1);    
}

function make_node_draggable(el) {
    let x1 = 0, y1 = 0, x2 = 0, y2 = 0;

    handle = el.querySelector("img.handle");
    handle.onmousedown = start_drag;

    function start_drag(e) {
        e.preventDefault();

        let top = el.offsetTop;
        let left = el.offsetLeft;

        el.style.position = "absolute";

        el.style.top = top + "px";
        el.style.left = left + "px";

        x2 = e.clientX;
        y2 = e.clientY;
        
        document.onmouseup = end_drag;
        document.onmousemove = drag;
    }

    function drag(e) {
        e.preventDefault();

        x1 = x2 - e.clientX;
        y1 = y2 - e.clientY;
        x2 = e.clientX;
        y2 = e.clientY;

        el.style.top = (el.offsetTop - y1) + "px";
        el.style.left = (el.offsetLeft - x1) + "px";
    }

    function end_drag() {
        document.onmouseup = null;
        document.onmousemove = null;

        snap_to_grid(el);
    }
}

function snap_to_grid(e, x = null, y = null) {
    if (x == null) {
        x = Math.round(e.offsetLeft / (NODESIZE + GAP)) + 1;
    }
    if (y == null) {
        y = Math.round(e.offsetTop / (NODESIZE + GAP)) + 1;
    }

    while (x + e.width - 1> e.parentNode.width) {
        x--;
    }

    e.style.top = "";
    e.style.left = "";
    e.style.position = "relative";

    e.style.gridColumn = x + "/" + (x + e.width);
    e.style.gridRow = y + "/" + (y + e.height);
}

function icon_path(name) {
    return "icons/" + name;
}
