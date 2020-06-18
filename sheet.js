const NODESIZE = 32;
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

    let handle = document.createElement("img");
    handle.classList.add("handle", "icon");
    handle.src = icon_path("handle.png");
    node.appendChild(handle);

    make_node_draggable(node);

    node.oncontextmenu = function (e) {
        e.preventDefault();
        node_settings(node);
    };

    document.getElementById("sheet").appendChild(node);
    snap_to_grid(node);
}

function node_size(k) {
    return k * NODESIZE + (k - 1) * GAP;    
}

function node_settings(node) {
    let menu = node.querySelector(".menu");
    if (!menu) {
        menu = create_menu(node);
    }
    else {
        menu.style.visibility = "visible";
    }

    close_menu = function () {
        menu.style.visibility = "hidden";
        window.removeEventListener("mouseup", click_off_menu);
    };

    click_off_menu = function (e) {
        if (
            e.target == menu ||
            e.target.classList.contains("menuitem") ||
            e.target.parentNode.classList.contains("menuitem")
        ) {
            return;
        }
        close_menu();
    };

    menu.close = close_menu;
    window.addEventListener("mouseup", click_off_menu);
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

    menu.appendChild(create_menu_item("Settings", "cog.png"));
    menu.appendChild(create_resize_menu_item(node));
    
    return menu;
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

function create_resize_menu_item(node) {
    resize_node = function (node) {
        node.querySelector(".menu").close();

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
        node.querySelector(".resize_handle.bottom").remove();
        node.querySelector(".resize_handle.right").remove();
        resize_to_grid(node);
    }

    let resize = create_menu_item("Resize", "resize.png");
    resize.resizing = false;
    resize.onclick = function (e) {
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
            node.style.width = (parseInt(node.style.width, 10) - v1) + "px";
        }
        else {
            node.style.height = (parseInt(node.style.height, 10) - v1) + "px";
            el.style.top = (el.offsetTop - v1) + "px";
        }
    }

    function end_drag() {
        document.onmouseup = null;
        document.onmousemove = null;

        el.style.top = "";
        el.style.left = "";

        resize_to_grid(node);
    }
}

function resize_to_grid(node) {
    let current_width = parseInt(node.style.width, 10);
    node.width = Math.max(Math.round(current_width / (NODESIZE + GAP)), 1);
    node.style.width = node_size(node.width) + "px";

    let current_height = parseInt(node.style.height, 10);
    node.height = Math.max(Math.round(current_height / (NODESIZE + GAP)), 1);
    node.style.height = node_size(node.height) + "px";
    snap_to_grid(node);
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
