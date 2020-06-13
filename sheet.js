var NODESIZE = 100;
var GAP = 10; 

function set_up_sheet() {    
    let sheet = document.createElement("div");
    sheet.classList = "sheet";

    let node_qty = Math.floor(window.innerWidth / (NODESIZE + GAP));
    sheet.style.width = node_qty * (NODESIZE + GAP) - GAP + "px";
    sheet.style.gridGap = GAP + "px";
    let columnstring = (NODESIZE + "px ").repeat(node_qty).slice(0, -1);
    sheet.style.gridTemplateColumns = columnstring;
    sheet.style.gridTemplateRows = `minmax(${NODESIZE}, ${NODESIZE})`;

    document.body.appendChild(sheet);

    n = create_node(1, 2, "node 1");
    n.style.gridColumn = "2/3";
    n.style.gridRow = "2/4";
    sheet.appendChild(n);
    n = create_node(2, 1, "node 2");
    n.style.gridColumn = "1/3";
    n.style.gridRow = "1/2";
    sheet.appendChild(n);
    sheet.appendChild(create_node(1, 1, "node 3"));
    n = create_node(2, 2, "node 4");
    n.style.gridColumn = "4/6";
    n.style.gridRow = "1/3";
    sheet.appendChild(n);
}

function create_node(w, h, name) {
    let node = document.createElement("div");
    node.classList.add("node");
    node.innerHTML = name;
    node.style.width = `${w * NODESIZE + (w - 1) * GAP}px`;
    node.style.height = `${h * NODESIZE + (h - 1) * GAP}px`;

    let handle = document.createElement("img");
    handle.classList.add("handle");
    handle.src = "handle.png";
    node.appendChild(handle);

    make_draggable(node);

    let lock = document.createElement("img");
    lock.classList.add("lock");
    lock.src = "unlock.png";
    lock.onclick = toggle_locked;
    node.appendChild(lock);

    return node;
}

function toggle_locked(e) {
    let lock = e.target;
    if (lock.classList.contains("locked")) {
        lock.src = "unlock.png";
        lock.classList.remove("locked");
    }
    else {
        lock.classList.add("locked");
        lock.src = "lock.png";
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

        el.style.position = "relative";
    }

}

function snap_to_grid(e) {
    
}
