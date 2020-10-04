const NODESIZE = 32;
const GAP = 10;
const TOOLBAR_WIDTH = 70;
const NODE_HEADER_HEIGHT = 20;
const LIST_ITEM_HEIGHT = 29;

function set_up_shortcuts() {
    document.onkeydown = function (e) {
        // https://stackoverflow.com/a/19589671

        if (e.key == "Backspace" && !(e.target.tagName == "INPUT" ||
            e.target.contentEditable == "true")) {

            e.preventDefault();
        }
        else if (e.key == "s" && e.ctrlKey) {
            e.preventDefault();
            document.getElementById("save_menu").show();
        }
    };
}

function set_up_sheet() {    
    let sheet = document.getElementById("sheet");

    sheet.resize = function () {
        if (sheet.width === 0) {
            sheet.width = Math.floor(
                (window.innerWidth - TOOLBAR_WIDTH) / (NODESIZE + GAP));    
        }
        if (sheet.height === 0) {
            sheet.height = Math.max(
                Math.floor(window.innerHeight / (NODESIZE + GAP)), 10);
        }
        
        sheet.style.width = sheet.width * (NODESIZE + GAP) - GAP + "px";
        sheet.style.gridGap = GAP + "px";
        sheet.style.gridTemplateColumns = 
            (NODESIZE + "px ").repeat(sheet.width).slice(0, -1);
        sheet.style.gridTemplateRows = 
            (NODESIZE + "px ").repeat(sheet.height).slice(0, -1);
            
    };

    sheet.width = 0;
    sheet.height = 10;
    sheet.resize();

    window.onresize = function () {
        sheet.width = 0;
        sheet.resize();
    };

    sheet.save_title = "untitled";
    // window.onbeforeunload = function (e) {
    //     save_sheet(sheet, sheet.save_title);
    // };
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

    let settings = create_tool("cog.png");
    let settings_panel = create_document_settings();
    settings.onclick = function () {
        settings_panel.show();
    };
    tools.appendChild(settings);
}

function create_tool(icon) {
    let tool = document.createElement("button");
    tool.classList.add("tool");
    
    let img = document.createElement("img");
    img.src = icon_path(icon);
    tool.appendChild(img);

    return tool;
}

function create_document_settings() {
    let panel = document.getElementById("document_settings");
    panel.innerHTML = "";
    panel.style.display = "none";
    panel.show = function () {
        fade_out();
        panel.style.display = "block";
    };
    panel.hide = function () {
        fade_in();
        panel.style.display = "none";
    };
    panel.classList.add("panel");

    let header = document.createElement("div");
    header.classList.add("panel_header");
    panel.appendChild(header);

    let title = document.createElement("span");
    title.classList.add("title");
    title.innerText = "Settings";
    header.appendChild(title);

    let close = create_control("cross.png", "background");
    close.onclick = panel.hide;
    header.appendChild(close);

    let settings = document.createElement("div");
    settings.classList.add("settings")
    panel.appendChild(settings);
    
    let node_size = document.createElement("div");
    node_size.classList.add("setting");
    settings.appendChild(node_size);
    
    let node_size_label = document.createElement("span");
    node_size_label.innerText = "Block size"
    node_size_label.classList.add("label");
    node_size.appendChild(node_size_label);

    return panel;
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

    make_double_click_editable(title);

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
    make_node_resizeable(node);

    node.oncontextmenu = function (e) {
        e.preventDefault();
        close_all_menus();
        create_context_menu(
            node,
            [
                [
                    node.classList.contains("locked") ?
                        "unlock.png" : "lock.png",
                    node.classList.contains("locked") ?
                        "Unlock": "Lock",
                    function (item) {
                        if (node.classList.contains("locked")) {
                            node.classList.remove("locked");
                            item.querySelector(".icon").src =
                                icon_path("lock.png");
                            item.querySelector(".label").innerHTML = "Lock";
                        }
                        else {
                            node.classList.add("locked");
                            item.querySelector(".icon").src = 
                                icon_path("unlock.png");
                            item.querySelector(".label").innerHTML = "Unlock";
                            node.end_resize();
                        }
                        update_editable(node);
                    },
                    false
                ],
                [
                    "resize.png",
                    "Resize",
                    function (item) {
                        let label = item.querySelector(".label");
                        if (node.resizing) {
                            node.end_resize();
                            label.innerHTML = "Resize";
                        }
                        else {
                            node.resize();
                            label.innerHTML = "Finish";
                        }
                        node.resizing = !node.resizing;
                    },
                    true
                ],
                [
                    "cog.png",
                    "Settings",
                    function (item) {
                        node_settings(node);
                    },
                    false
                ],
                [
                    "cross.png",
                    "Delete",
                    function (item) {
                        node.remove()
                    },
                    true
                ],
                [
                    "clone.png",
                    "Clone",
                    function (item) {
                        let new_node = node_from_dict(node_to_dict(node));
                        new_node.style.gridArea = "";
                        snap_to_grid(new_node);
                        document.getElementById("sheet").appendChild(new_node);
                    }
                ]
            ],
            true
        )
    };

    document.getElementById("sheet").appendChild(node);
    position_node(node);

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
                e.keyCode === 8 /* Backspace */ 
                || e.keyCode === 9 /* Tab */
                || (e.keyCode >= 48 && e.keyCode <= 57) /* 0-9 */
                || (e.keyCode >= 37 && e.keyCode <= 40) /* Arrows */
                || (e.key == "+" || e.key == "-")
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
        
        function add_item(is_break) {
            let new_item = is_break ? create_list_break() : create_list_item();
            new_item.style.order = content.children.length;
            content.appendChild(new_item);
        }

        let add_btn = create_control("add.png", "toggle", "background");
        add_btn.onclick = function () {
            add_item(false);
        };
        create_context_menu(
            add_btn,
            [
                [
                    "add.png",
                    "Item",
                    function (item) {
                        add_item(false);
                    }
                ],
                [
                    "handle.png",
                    "Break",
                    function (item) {
                        add_item(true);
                    }
                ]
            ]
        );

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

function create_icon(icon_name) {
    let container = document.createElement("div");
    let icon = document.createElement("img");
    icon.src = icon_path(icon_name);
    icon.classList.add("icon");
    container.appendChild(icon);
    
    return container;
}

function create_control(image, ...classes) {
    let btn = create_icon(image);
    btn.classList.add("control");
    classes.forEach(c => {
        btn.classList.add(c);
    });

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

function create_list_item_controls_box(item) {
    let controls_box = document.createElement("div");
    controls_box.classList.add("padding", "controls_box");

    let handle = create_control("handle.png", "handle", "toggle");
    make_list_item_draggable(item, handle);
    controls_box.appendChild(handle);

    let remove_btn = create_control("cross.png", "control", "toggle");
    remove_btn.onclick = function () {
        item.remove();
    };
    controls_box.append(remove_btn);

    return controls_box;
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

    new_item.appendChild(create_list_item_controls_box(new_item));

    return new_item;
}

function create_list_break(title="Break") {
    let new_break = document.createElement("div");
    new_break.classList.add("list_item", "list_break");

    let left_padding = document.createElement("div");
    left_padding.classList.add("padding");
    new_break.appendChild(left_padding);

    let break_title = document.createElement("span");
    break_title.classList.add("title", "list_item_content");
    break_title.innerHTML = title;
    make_double_click_editable(break_title);
    new_break.appendChild(break_title);

    let right_padding = document.createElement("div");
    right_padding.classList.add("padding");
    new_break.appendChild(right_padding);

    right_padding.appendChild(create_list_item_controls_box(new_break));

    return new_break;
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

function node_settings(node) {
    let settings = node.querySelector(".settings"); 
    if (!settings) {
        settings = create_node_settings(node); 
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

function create_node_settings(node) {
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
        header.style.minHeight
            = title_active.checked ? `${NODE_HEADER_HEIGHT}px` : "0px";
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
            no_transition(node, () => { snap_to_grid(node) });
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
            no_transition(node, () => { snap_to_grid(node) });
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
    time.innerText = new Date(save.time).toLocaleDateString("en-AU");
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

function close_all_menus() {
    document.querySelectorAll(".menu").forEach(menu => {
        menu.close();
    });
}

function create_context_menu(parent, item_tuples, visible=false) {
    let menu = document.createElement("div");
    menu.classList.add("menu");
    if (!visible) {
        menu.style.visibility = "hidden";
    }
    parent.appendChild(menu);

    item_tuples.forEach(tuple => {
        let [icon_name, title, func, toggled] = tuple;        

        let item = document.createElement("div");
        item.classList.add("menuitem");
    
        let icon = document.createElement("img");
        icon.classList.add("icon");
        icon.src = icon_path(icon_name);
        item.appendChild(icon);
    
        let label = document.createElement("span");
        label.classList.add("label");
        label.innerHTML = title;
        item.appendChild(label);

        if (toggled) {
            item.classList.add("toggle");
        }
    
        item.onclick = function (e) {
            e.stopPropagation();
            menu.close();
            func(item);
        }

        menu.appendChild(item);
    });

    function click_off_menu(e) {
        if (!(e.target == menu || menu.contains(e.target))) {
            menu.close();
        }
    }

    menu.close = function () {
        menu.style.visibility = "hidden";
        window.removeEventListener("click", click_off_menu);
    }

    menu.show = function () {
        menu.style.visibility = "visible";
        window.addEventListener("click", click_off_menu);
    }

    menu.onclick = function (e) {
        e.stopPropagation();
    }
    
    parent.oncontextmenu = function (e) {
        e.stopPropagation();
        e.preventDefault();
        close_all_menus();
        menu.show();
    }
}

function parent_node_locked(el) {
    while (!el.classList.contains("node")) {
        el = el.parentNode;
    }

    return el.classList.contains("locked");
}

function make_double_click_editable(el) {
    el.ondblclick = function () {
        if (parent_node_locked(el)) {
            return;
        }

        el.tabIndex = "0";

        el.contentEditable = "true";
        el.focus();

        el.onblur = function () {
            el.contentEditable = "false";
            el.scrollLeft = 0; // display from left end of title
            el.onblur = null;
        };
    };
}

function make_list_item_draggable(el, handle) {
    let ymin, list_content;

    function start_drag(e) {
        e.preventDefault();
        
        list_content = el.parentNode;
        ymin = list_content.getBoundingClientRect().top + window.pageYOffset;

        document.onmouseup = end_drag;
        document.onmousemove = drag;
    }

    function drag(e) {
        e.preventDefault();

        let offset = e.pageY + list_content.scrollTop - ymin;

        let new_index = Math.min(
            Math.max(Math.floor(offset / LIST_ITEM_HEIGHT), 0),
            list_content.children.length
        );

        let old_index = el.style.order;
        
        for (let item of list_content.children) {
            if (item.style.order == new_index) {
                item.style.order = old_index;
            }
        }
        el.style.order = new_index;
    }

    function end_drag() {
        document.onmouseup = null;
        document.onmousemove = null;
    }

    handle.onmousedown = start_drag;
}

function make_node_resizeable(node) {
    node.resize = function () {
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

    node.end_resize = function () {
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

    node.resizing = false;
}

function make_resize_handle_draggable(el, node) {
    let v1 = 0, v2 = 0;
    let x_direction = el.classList.contains("left") 
        || el.classList.contains("right");
    let ghost = node.querySelector(".node_ghost");
    let minv = x_direction ? el.offsetLeft : el.offsetTop;

    el.onmousedown = start_drag;

    function start_drag(e) {
        e.preventDefault();

        let top = el.offsetTop;
        let left = el.offsetLeft;

        no_transition(el, () => {
            el.style.position = "absolute";
            el.style.top = top + "px";
            el.style.left = left + "px";
            el.style.width = node_size(el.width) + "px";
            el.style.height = node_size(el.height) + "px";
        });
        v2 = x_direction ? e.clientX : e.clienty;
        
        document.onmouseup = end_drag;
        document.onmousemove = drag;
    }

    function drag(e) {
        e.preventDefault();

        v1 = v2 - (x_direction ? e.clientX : e.clientY);
        v2 = x_direction ? e.clientX : e.clientY;

        if (x_direction) {
            let new_width = 
                Math.max(parseInt(node.style.width, 10) - v1, NODESIZE);
            if (new_width != NODESIZE) {
                el.style.left = (el.offsetLeft - v1) + "px";
            }
            else {
                start_drag(el);
            }

            no_transition(node, () => {
                node.style.width = new_width + "px";
            });
            ghost.style.width = new_width + 4 + "px";
            resize_to_grid(ghost, true, false);
            ghost.style.width = parseInt(ghost.style.width, 10) + 4 + "px";
        }
        else {
            let new_height = 
                Math.max(parseInt(node.style.height, 10) - v1, NODESIZE);
            if (new_height != NODESIZE) {
                el.style.top = (el.offsetTop - v1) + "px";
            }
            else {
                start_drag(el);
            }

            no_transition(node, () => {
                node.style.height = new_height + "px";
            });
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
        
        no_transition(el, () => {
            el.style.top = (el.offsetTop - y1) + "px";
            el.style.left = (el.offsetLeft - x1) + "px";
        });
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

    let sheet = document.getElementById("sheet");
    if (y > sheet.height) {
        sheet.height = y + e.height;
        sheet.resize();
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

function parse_grid_area(node) {
    let x1 = parseInt(node.style.gridColumnStart);
    let x2 = parseInt(node.style.gridColumnEnd);
    let y1 = parseInt(node.style.gridRowStart);
    let y2 = parseInt(node.style.gridRowEnd);

    return [x1, x2, y1, y2];
}

function position_node(node) {
    let sheet = document.getElementById("sheet");
    snap_to_grid(node);
    refresh_css(node);

    let [x1, x2, y1, y2] = parse_grid_area(node);

    sheet.querySelectorAll(".node").forEach(n => {
        if (n == node) {
            return;
        }

        let [nx1, nx2, ny1, ny2] = parse_grid_area(n);

        if ((x2 > nx1 && x1 < nx2) && (y2 > ny1 && y1 < ny2)) {
            // if possible, position to the right of this node, else
            // position down
        }
    });
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

function refresh_css(el) {
    el.offsetHeight;
}

function no_transition(el, func) {
    let old = el.style.transition;
    el.style.transition = "none";
    func();
    refresh_css(el);
    el.style.transition = old;
}
