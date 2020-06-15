const NODESIZE = 100;
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

    make_draggable(node);

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
    let menu = document.createElement("div");
    menu.classList.add("menu");
    menu.style.left = (node.offsetLeft + node_size(node.width) + 5) + "px";
    menu.style.top = node.offsetTop + "px";

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
    
    let resize = create_menu_item("Resize", "resize.png");
    resize.onclick = function (e) {
        resize_node(node);
    };
    menu.appendChild(resize);

    document.body.appendChild(menu);
    
    close_menu = function () {
        menu.remove();
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
        window.removeEventListener("mouseup", click_off_menu);
    };

    window.addEventListener("mouseup", click_off_menu);
}

function resize_node(node) {
    let top = document.createElement("div");
    top.classList.add("resize_handle", "top");
    node.appendChild(top);

    let bottom = document.createElement("div");
    bottom.classList.add("resize_handle", "bottom");
    node.appendChild(bottom);

    let left = document.createElement("div");
    left.classList.add("resize_handle", "left");
    node.appendChild(left);

    let right = document.createElement("div");
    right.classList.add("resize_handle", "right");
    node.appendChild(right);
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

function add_node_to_sheet(e) {
    create_node(1, 1);    
}

function make_draggable(el, end_drag) {
    let x1 = 0, y1 = 0, x2 = 0, y2 = 0;

    let handle = el.querySelector("img.handle");
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
        
        document.onmouseup = end_drag || end_drag_default;
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

    function end_drag_default() {
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
