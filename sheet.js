var NODESIZE = 100;
var GAP = 10; 

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
    node.style.width = `${w * NODESIZE + (w - 1) * GAP}px`;
    node.style.height = `${h * NODESIZE + (h - 1) * GAP}px`;
    node.width = w;
    node.height = h;

    let handle = document.createElement("img");
    handle.classList.add("handle", "icon");
    handle.src = icon_path("handle.png");
    node.appendChild(handle);

    make_draggable(node);

    let lock = document.createElement("img");
    lock.classList.add("lock", "icon");
    lock.src = icon_path("unlock.png");
    lock.onclick = toggle_locked;
    node.appendChild(lock);

    let cog = document.createElement("img");
    cog.classList.add("cog", "icon");
    cog.src = icon_path("cog.png");
    node.appendChild(cog);

    document.getElementById("sheet").appendChild(node);
    if (w > 1 || h > 1) {
        snap_to_grid(node);
    }
}

function add_node_to_sheet(e) {
    create_node(1, 1);
}

function toggle_locked(e) {
    let lock = e.target;
    let handle = lock.parentNode.querySelector("img.icon.handle");
    let cog = lock.parentNode.querySelector("img.icon.cog");
    if (lock.classList.contains("locked")) {
        handle.classList.remove("hidden");
        cog.classList.remove("hidden");
        lock.src = icon_path("unlock.png");
        lock.classList.remove("locked");
    }
    else {
        snap_to_grid(lock.parentNode);
        handle.classList.add("hidden");
        cog.classList.add("hidden");
        lock.classList.add("locked");
        lock.src = icon_path("lock.png");
    }

}

function make_draggable(el) {
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
