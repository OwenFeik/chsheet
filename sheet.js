const NODESIZE = 32;
const GAP = 10; 
const TOOLBAR_WIDTH = 80;

function set_up_sheet() {    
    let sheet = document.getElementById("sheet");

    let node_qty = Math.floor(
        (sheet.offsetWidth - TOOLBAR_WIDTH) / (NODESIZE + GAP));
    sheet.style.width = node_qty * (NODESIZE + GAP) - GAP + "px";
    sheet.width = node_qty;
    sheet.style.gridGap = GAP + "px";
    let columnstring = (NODESIZE + "px ").repeat(node_qty).slice(0, -1);
    sheet.style.gridTemplateColumns = columnstring;
    sheet.style.gridTemplateRows = (NODESIZE + "px ").repeat(10).slice(0, -1);
    sheet.save_title = "untitled";
}

function set_up_toolbar() {
    let toolbar = document.getElementById("toolbar");
    let tools = document.getElementById("tools");

    let toggle = document.getElementById("tools_toggle");
    let toggle_img = document.createElement("img");
    toggle_img.src = icon_path("chevron_down.png"); 
    toggle.appendChild(toggle_img);
    toggle.onclick = function () {
        toolbar.classList.toggle("telescoped");
    
        toggle_img.src = toolbar.classList.contains("telescoped") ? 
            icon_path("chevron_up.png") : icon_path("chevron_down.png");
    };

    let add = create_tool("add.png");
    add.classList.add("toggle");
    tools.appendChild(add);
    add.onclick = add_node_to_sheet;

    let save = create_tool("save.png");
    save.classList.add("toggle");
    tools.appendChild(save);
    let save_menu = create_save_menu();
    save.onclick = function () {
        save_menu.show();
    };
}

function create_tool(icon) {
    let tool = document.createElement("button");
    tool.classList.add("tool");
    
    let img = document.createElement("img");
    img.src = icon_path(icon);
    tool.appendChild(img);

    return tool;
}

function create_node(w, h, type = "text") {
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
    title.title = "Title";
    header.appendChild(title);

    let handle = document.createElement("img");
    handle.classList.add("handle", "icon", "control");
    handle.src = icon_path("handle.png");
    handle.style.display = "none";
    header.appendChild(handle);

    let content = document.createElement("div");
    content.classList.add("content");
    node.appendChild(content);
    set_content_type(node, type);

    make_node_draggable(node);

    node.oncontextmenu = function (e) {
        e.preventDefault();
        node_menu(node);
    };

    document.getElementById("sheet").appendChild(node);
    snap_to_grid(node);

    return node;
}

function set_content_type(node, type = "text") {
    if (node.type === type) {
        return;
    }

    let header = node.querySelector(".header");
    let content = node.querySelector(".content");

    header.querySelectorAll(".control.toggle").forEach(c => {
        c.remove();        
    });

    content.onkeydown = null;
    content.classList.remove("text", "number", "list");
    if (type === "text") {
        content.classList.add("text");
        content.innerHTML = "Lorem ipsum dolor sit amet";
        content.contentEditable = true;
        content.spellcheck = false;
        content.style.fontSize = "10pt";
        content.style.textAlign = "left";
    }
    else if (type === "number") {
        content.classList.add("number");
        content.innerHTML = "1";
        content.contentEditable = true;
        content.spellcheck = false;
        content.style.fontSize = "20pt";
        content.style.textAlign = "center";

        function key_press_is_num(e) {
            if (
                event.keyCode === 8 /* Backspace */ 
                || event.keyCode === 9 /* Tab */
                || (event.keyCode >= 48 && event.keyCode <= 57) /* 0-9 */
                || (event.keyCode >= 37 && event.keyCode <= 40) /* Arrows */
                || (event.key == "+" || event.key == "-")
            ) {
                return;
            }
            e.preventDefault();
        }
        
        content.onkeydown = key_press_is_num;

        let increment_btn = create_control("add.png", "toggle", "background");
        increment_btn.onclick = function () {
            content.innerHTML 
                = (parseInt(content.innerHTML, 10) + 1).toString();
        };
        header.appendChild(increment_btn);

        let decrement_btn 
            = create_control("subtract.png", "toggle", "background");
        decrement_btn.onclick = function () {
            content.innerHTML
                = (parseInt(content.innerHTML, 10) - 1).toString();
        };
        header.appendChild(decrement_btn);
    }
    else if (type === "list") {
        content.classList.add("list");
        content.innerHTML = "";
        content.contentEditable = false;
        content.style.fontSize = "10pt";
        
        function add_item() {
            content.appendChild(create_list_item());            
        }

        let add_btn = create_control("add.png", "toggle", "background");
        add_btn.onclick = add_item;
        header.appendChild(add_btn);
    }
    else if (type === "die") {
        content.classList.add("die");
        content.innerHTML = "0";
        content.contentEditable = false;
        content.style.fontSize = "20pt";

        node.die_size = 20;
        
        let roll_btn = create_control("die.png", "background");
        roll_btn.onclick = function () {
            content.innerText 
                = Math.ceil(Math.random() * node.die_size).toString();
        };
        header.appendChild(roll_btn);
    }

    node.type = type;
    node.classList.add(type + "_content");
}

function create_control(image, ...classes) {
    let btn = document.createElement("img");
    btn.classList.add("icon", "control");
    classes.forEach(c => {
        btn.classList.add(c);
    });
    btn.src = icon_path(image);

    return btn;
}

function update_editable(node) {
    let editable = !node.classList.contains("locked");

    if (node.type == "text" || node.type == "number") {
        node.querySelector(".content").contentEditable = editable;
    }
    else if (node.type == "list") {
        node.querySelector(".content").querySelectorAll(".list_item")
            .forEach(i => {
            
            i.querySelector(".list_item_content").contentEditable = editable;
        });
    }
}

function create_list_item(content="New item") {
    let new_item = document.createElement("div");
    new_item.classList.add("list_item");
    new_item.appendChild(create_checkbox());

    let item_content = document.createElement("span");
    item_content.classList.add("list_item_content");
    item_content.contentEditable = true;
    item_content.spellcheck = false;
    item_content.innerText = content;
    new_item.append(item_content);

    let remove_btn = document.createElement("img");
    remove_btn.classList.add("icon", "control", "toggle");
    remove_btn.src = icon_path("cross.png");
    remove_btn.onclick = function () {
        new_item.remove();
    };
    new_item.append(remove_btn);

    return new_item;
}

function create_checkbox(checked=true) {
    let checkbox = document.createElement("div");
    checkbox.classList.add("checkbox");
    if (checked) {
        checkbox.classList.add("checked");
    }
    checkbox.value = checked;
    checkbox.onclick = function () {
        checkbox.value = !checkbox.value;
        checkbox.classList.toggle("checked"); 
    };

    let checkbox_img = document.createElement("img");
    checkbox_img.classList.add("icon");
    checkbox_img.src = icon_path("tick.png");
    checkbox.appendChild(checkbox_img);

    return checkbox;
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

    function click_off_menu(e) {
        if (e.target == menu || menu.contains(e.target)) {
            return;
        }
        menu.close();
    }

    function close_menu() {
        menu.style.visibility = "hidden";
        window.removeEventListener("click", click_off_menu);
    }

    menu.close = close_menu;

    window.addEventListener("click", click_off_menu);
}

function create_menu(node) {
    let menu = document.createElement("div");
    menu.classList.add("menu");
    node.appendChild(menu);

    let unlock = create_menu_item("Unlock", "unlock.png");
    let lock = create_menu_item("Lock", "lock.png");

    function toggle_locked(e) {
        if (node.classList.contains("locked")) {
            node.classList.remove("locked");
            menu.replaceChild(lock, unlock);
            update_editable(node);
        }
        else {
            node.classList.add("locked");
            menu.replaceChild(unlock, lock);
            update_editable(node);
            resize.end();
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
    };

    menu.appendChild(settings);
    
    let resize = create_resize_menu_item();
    resize.classList.add("toggle");
    menu.appendChild(resize);
    
    let remove = create_menu_item("Delete", "cross.png");
    remove.classList.add("toggle");
    remove.onclick = function () {
        node.remove();
    };
    menu.appendChild(remove);

    let clone = create_menu_item("Clone", "clone.png");
    clone.onclick = function () {
        let new_node = node_from_dict(node_to_dict(node));
        new_node.style.gridArea = "";
        snap_to_grid(new_node);
        document.getElementById("sheet").appendChild(new_node);
        menu.close();
    };
    menu.appendChild(clone);

    return menu;
}

function node_settings(node) {
    let settings = node.querySelector(".settings"); 
    if (!settings) {
        settings = create_settings(node); 
    }

    function click_off_settings (e) {
        if (e.target == settings || settings.contains(e.target)) {
            return;
        }
        settings.style.visibility = "hidden";
        window.removeEventListener("mousedown", click_off_settings);
    }
    window.addEventListener("mousedown", click_off_settings);

    settings.style.visibility = "visible";
}

function create_settings(node) {
    let header = node.querySelector(".header");
    let content = node.querySelector(".content");

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
    title_input.value = node_title.innerText;
    title_input.oninput = function () {
        node_title.innerHTML = title_input.value;
        node_title.title = title_input.value;
    };
    title.appendChild(title_input);

    let title_active = document.createElement("input");
    title_active.type = "checkbox";
    title_active.checked = node_title.style.display !== "none";
    title_active.oninput = function () {
        node_title.style.display 
            = title_active.checked ? "inline" : "none";
    };
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
    [ "text", "number", "list", "die" ].forEach(t => {
        let option = document.createElement("option");
        option.innerHTML = t;
        type_dropdown.appendChild(option);
    });
    type_dropdown.value = node.type;
    type_dropdown.onchange = function () {
        set_content_type(node, type_dropdown.value);
    };
    type.appendChild(type_dropdown);

    let controls_label = document.createElement("span");
    controls_label.classList.add("label");
    controls_label.innerHTML = "Controls";
    type.appendChild(controls_label);

    let controls_active = document.createElement("input");
    controls_active.type = "checkbox";
    controls_active.checked = !node.classList.contains("controls_inactive");
    controls_active.oninput = function () {
        node.classList.toggle("controls_inactive");
    };
    type.appendChild(controls_active);

    let font = document.createElement("div");
    font.classList.add("setting");
    settings.appendChild(font);

    let font_label = document.createElement("span");
    font_label.classList.add("label");
    font_label.innerHTML = "Font size";
    font.appendChild(font_label);

    let font_input = document.createElement("input");
    font_input.type = "number";
    font_input.value = parseInt(content.style.fontSize, 10).toString();
    font_input.oninput = function () {
        let new_size = Math.max(0, font_input.value);
        if (new_size >= 0) {
            content.style.fontSize = new_size + "pt";
        }
    };
    font.appendChild(font_input);

    let checkboxes = document.createElement("div");
    checkboxes.classList.add("setting", "list_content");
    settings.appendChild(checkboxes);

    let checkboxes_label = document.createElement("span");
    checkboxes_label.classList.add("label");
    checkboxes_label.innerHTML = "Checkboxes";
    checkboxes.appendChild(checkboxes_label);

    let checkboxes_input = document.createElement("input");
    checkboxes_input.type = "checkbox";
    checkboxes_input.checked = content.classList.contains("checkboxes_active");
    checkboxes_input.onclick = function () {
        content.classList.toggle("checkboxes_active");
    };
    checkboxes.appendChild(checkboxes_input);

    let die_size = document.createElement("div");
    die_size.classList.add("setting", "die_content");
    settings.appendChild(die_size);

    let die_size_label = document.createElement("span");
    die_size_label.classList.add("label");
    die_size_label.innerHTML = "Die size";
    die_size.appendChild(die_size_label);

    let die_size_input = document.createElement("input");
    die_size_input.type = "number";
    die_size_input.value 
        = node.die_size !== undefined ? node.die_size.toString() : "20";
    die_size_input.oninput = function () {
        node.die_size = die_size_input.value;
    };
    die_size.appendChild(die_size_input);

    node.appendChild(settings);

    return settings;
}

function create_save_menu() {
    let sheet = document.getElementById("sheet");

    let menu = document.getElementById("save_menu");
    menu.innerHTML = "";
    menu.style.display = "none";
    menu.show = function () {
        fade_out();
        reload_saves();
        menu.style.display = "block";
    };
    menu.hide = function () {
        fade_in();
        menu.style.display = "none";
    };
    menu.classList.add("panel");

    let header = document.createElement("div");
    header.classList.add("panel_header");
    menu.appendChild(header);

    let header_checkbox = create_checkbox(false);
    header_checkbox.onclick = function () {
        header_checkbox.value = !header_checkbox.value;
        header_checkbox.classList.toggle("checked");
        
        save_list.querySelectorAll(".list_item").forEach(e => {
            let checkbox = e.querySelector(".checkbox"); 
            checkbox.value = header_checkbox.value;
            
            if (header_checkbox.value) {
                checkbox.classList.add("checked");
            }
            else {
                checkbox.classList.remove("checked");
            }
        });
    };
    header.appendChild(header_checkbox);

    let header_input = document.createElement("input");
    header_input.value = sheet.save_title;
    header_input.minLength = 1;
    header_input.maxLength = 32;
    header.appendChild(header_input);

    function check_for_input(e) {
        if (header_input.value != "") {
            header_input.setCustomValidity("");
            header_input.removeEventListener("keyup", check_for_input);
        }
    }
    
    let save = create_control("save.png", "background");
    save.title = "Save";
    save.onclick = function () {
        if (header_input.value === "") {
            header_input.setCustomValidity("Title required to save.");
            header_input.addEventListener("keyup", check_for_input);
        }
        else {
            save_sheet(sheet, header_input.value, reload_saves);
            sheet.save_title = header_input.value;
        }
    };
    header.appendChild(save);

    let upload = document.createElement("div");
    upload.classList.add("control", "input_holder");
    header.appendChild(upload);

    let upload_img = document.createElement("img");
    upload_img.classList.add("icon");
    upload_img.src = icon_path("up.png");
    upload.appendChild(upload_img);

    let upload_input = document.createElement("input");
    upload_input.title = "Upload save";
    upload_input.type = "file";
    upload_input.accept = ".json";
    upload.appendChild(upload_input);
    upload_input.oninput = function () {
        upload_sheet(upload_input.files[0], reload_saves);
        reload_saves();
    };

    let trash = create_control("trash.png", "background");
    trash.title = "Delete selected";
    trash.onclick = function () {
        let saves_to_delete = [];
        save_list.querySelectorAll(".list_item").forEach(e => {
            let checkbox = e.querySelector(".checkbox");
            if (checkbox.classList.contains("checked")) {
                saves_to_delete.push(e.save_title);     
            }
        });

        if (saves_to_delete.length) {
            delete_sheets(saves_to_delete, reload_saves);
            header_checkbox.click();
        }
    };
    header.appendChild(trash);


    let close = create_control("cross.png", "background");
    close.title = "Close";
    close.onclick = menu.hide;
    header.appendChild(close);

    let save_list = document.createElement("div");
    save_list.classList.add("save_list");
    menu.appendChild(save_list);

    function reload_saves() {
        save_list.querySelectorAll(".list_item").forEach(e => {
            e.remove();
        });

        get_all_sheets(data => {
            data.sort((a, b) => a.time - b.time);
            data.forEach(save_file => {
                save_list.appendChild(create_save_list_item(save_file, () => {
                    header_input.value = save_file.title;
                }));
            });
        });
    }

    let empty = document.createElement("span");
    empty.classList.add("label");
    empty.innerText = "No saves";
    save_list.append(empty);

    return menu;
}

function create_save_list_item(save, load_callback) {
    let list_item = document.createElement("div");
    list_item.save_title = save.title;
    list_item.classList.add("list_item");

    let checkbox = create_checkbox(false);
    list_item.appendChild(checkbox);

    let title = document.createElement("span");
    title.classList.add("label", "save_title");
    title.title = `Load "${save.title}"`;
    title.innerText = save.title;
    title.onclick = function () {
        load_sheet(sheet, save.title, load_callback);
    };

    list_item.appendChild(title);

    let time = document.createElement("span");
    time.classList.add("label");
    time.innerText = new Date(save.time).toLocaleDateString('en-AU');
    list_item.appendChild(time);

    let node_count = document.createElement("span");
    node_count.classList.add("label");
    node_count.innerText = save.data.length.toString() + " nodes";
    list_item.appendChild(node_count);

    let trash = create_control("trash.png", "background");
    trash.title = "Delete";
    trash.onclick = function () {
        delete_sheet(save.title);
        list_item.remove();
    };
    list_item.appendChild(trash);
    
    let download = create_control("down.png", "background");
    download.title = "Download";
    download.onclick = function () {
        download_sheet(save.title);
    };
    list_item.appendChild(download);

    return list_item;
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
    function resize_node(node) {
        let ghost = document.createElement("div");
        ghost.classList.add("node_ghost");
        node.appendChild(ghost);
        ghost.width = node.width;
        ghost.height = node.height;
        ghost.style.width = parseInt(node.style.width, 10) + 4 + "px";
        ghost.style.height = parseInt(node.style.height, 10) + 4 + "px";

        node.querySelector(".header")
            .querySelector(".handle").style.display = "block";

        let bottom = document.createElement("div");
        bottom.classList.add("resize_handle", "bottom");
        make_resize_handle_draggable(bottom, node);
        node.appendChild(bottom);
    
        let right = document.createElement("div");
        right.classList.add("resize_handle", "right");
        make_resize_handle_draggable(right, node);
        node.appendChild(right);
    }

    function end_resize(node) {
        try {
            node.querySelector(".node_ghost").remove();
            node.querySelector(".resize_handle.bottom").remove();
            node.querySelector(".resize_handle.right").remove();
            node.querySelector(".header")
                .querySelector(".handle").style.display = "none";
            resize_to_grid(node);
            snap_to_grid(node);    
        }
        catch {

        }
    }

    let resize = create_menu_item("Resize", "resize.png");
    resize.end = function () {
        end_resize(resize.parentNode.parentNode);
    };
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
    create_node(2, 2);    
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

function fade_out() {
    document.getElementById("fade").classList.add("active");
}

function fade_in() {
    document.getElementById("fade").classList.remove("active");
}
