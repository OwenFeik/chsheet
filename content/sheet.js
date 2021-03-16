var NODESIZE = 32;
var GAP = 10;
const TOOLBAR_WIDTH = 70;
const NODE_HEADER_HEIGHT = 20;
const LIST_ITEM_HEIGHT = 29;
const NODE_TYPES = ["text", "number", "list", "die", "image", "checkbox"];

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

    sheet.resize = function (w = 0, h = 0) {
        sheet.width = Math.max(
            w,
            Math.floor(
                (window.innerWidth - TOOLBAR_WIDTH) / (NODESIZE + GAP)
            )
        );
        sheet.height = Math.max(
            h,
            Math.floor(window.innerHeight / (NODESIZE + GAP)) - 1,
            20
        );

        sheet.style.width = sheet.width * (NODESIZE + GAP) - GAP + "px";
        sheet.style.gridGap = GAP + "px";
        sheet.style.gridTemplateColumns = 
            (NODESIZE + "px ").repeat(sheet.width).slice(0, -1);
        sheet.style.gridTemplateRows = 
            (NODESIZE + "px ").repeat(sheet.height).slice(0, -1);
            
    };

    sheet.width = 0;
    sheet.height = 22;
    sheet.resize();

    window.onresize = function () {
        sheet.width = 0;
        sheet.resize();
    };

    sheet.save_title = "untitled";
    set_document_title(sheet.save_title);
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
        toolbar.classList.add("telescoping");
        toolbar.classList.toggle("telescoped");
        setTimeout(() => toolbar.classList.remove("telescoping"), 500);
    };

    tools.appendChild(create_add_tool());
    tools.appendChild(create_group_tool());

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

function end_all_tool_processes() {
    document.getElementById("toolbar").querySelectorAll(".tool").forEach(t => {
        if (t.active === true) {
            t.click();
        }
    });
}

function create_add_tool() {
    let add = create_tool("add.png");
    add.classList.add("toggle");
    
    let node_style_reference = create_node(2, 2, "text", false);
    let node_style_settings = create_node_settings(node_style_reference);
    node_style_settings.classList.add("left");
    node_style_settings.style.display = "none";
    add.appendChild(node_style_settings);

    add.classList.add("text_content");
    add.oncontextmenu = e => {
        node_style_settings.show();
        e.preventDefault();
    };

    let ghost = create_preview_ghost();
    node_style_settings.addEventListener(
        "mouseleave",
        _ => {
            ghost.set_dimensions(
                node_style_reference.width,
                node_style_reference.height
            );
        }
    );

    let sheet = document.getElementById("sheet");
    let place_node = e => {
        if (e.target != sheet && e.target != ghost) {
            return;
        }

        let data = node_to_dict(node_style_reference);
        [data.x, data.y] = placement_click_to_grid_coord(e, ghost);

        node = node_from_dict(data);
        snap_to_grid(node, data.x, data.y);
    };

    let handle_esc = e => {
        if (e.key == "Escape") {
            add.click();
        }
    };

    add.active = false;
    add.onclick = e => {
        if (e.target == node_style_settings) {
            NODE_TYPES.forEach(t => {
                let content_class = t + "_content";

                add.classList.remove(content_class);
                if (content_class in node_style_reference.classList) {
                    add.classList.add(content_class);
                }
            });
        }
        else if (add.active) {
            add.active = false;
            ghost.end_preview();

            sheet.removeEventListener("click", place_node);
            sheet.classList.remove("placing");

            document.removeEventListener("keyup", handle_esc);

            add.querySelector("img").src = icon_path("add.png");
        }
        else {
            end_all_tool_processes();

            add.active = true;
            ghost.start_preview();
            
            sheet.classList.add("placing");
            sheet.resize(0, 0);
            sheet.addEventListener("click", place_node);

            document.addEventListener("keyup", handle_esc);

            add.querySelector("img").src = icon_path("tick.png");
        }
    };

    return add;
}

function create_group_tool() {
    let group = create_tool("clone.png");
    let ghost = create_preview_ghost(1, 1);
    let sheet = document.getElementById("sheet");

    let sheet_click_handler = e => {
        if (e.target != sheet && e.target != ghost) {
            return;
        }
        
        if (ghost.pin) {
            let group = create_node_group(ghost);
            end_group();
            ghost.pin = null;
            ghost.set_dimensions(1, 1);
        }
        else {
            ghost.set_pin(e);
        }
    };

    let handle_esc = e => {
        if (e.key == "Escape") {
            end_group();
        }
    };

    let end_group = () => {
        document.removeEventListener("keyup", handle_esc);
        sheet.classList.remove("placing");
        sheet.removeEventListener("click", sheet_click_handler);
        ghost.end_preview();
        group.querySelector("img").src = icon_path("clone.png");
        group.active = false;
    };

    group.active = false;
    group.onclick = _ => {
        if (group.active) {
            end_group();
        }
        else {
            end_all_tool_processes();

            document.addEventListener("keyup", handle_esc);
            sheet.classList.add("placing");
            sheet.addEventListener("click", sheet_click_handler);
            ghost.start_preview();
            group.querySelector("img").src = icon_path("cross.png");
            group.active = true;
        }
    };

    return group;
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

    let header = create_element("div", ["panel_header"]);
    panel.appendChild(header);

    let title = create_element("span", ["title"]);
    title.innerText = "Settings";
    header.appendChild(title);

    let close = create_control("cross.png", "background");
    close.onclick = panel.hide;
    header.appendChild(close);

    let settings = create_element("div", ["entry_list"]);
    panel.appendChild(settings);

    let node_size = create_element("div", ["list_item"]);
    settings.appendChild(node_size);

    let node_size_label = create_element("span", ["label"]);
    node_size_label.innerText = "Node size";
    node_size.appendChild(node_size_label);

    const MIN_NODESIZE = 10;
    const MAX_NODESIZE = 100;

    let node_size_input = create_element("input", ["secondary"]);
    node_size_input.type = "number";
    node_size_input.min = MIN_NODESIZE;
    node_size_input.max = MAX_NODESIZE;
    node_size_input.value = NODESIZE;
    node_size.appendChild(node_size_input);

    node_size_input.oninput = function () {
        let new_size = node_size_input.value;
        if (new_size >= MIN_NODESIZE && new_size <= MAX_NODESIZE) {
            NODESIZE = new_size;
            document.getElementById("sheet").resize();
            resize_all_nodes();
        }
    };

    let gap_size_label = create_element("span", ["label"]);
    gap_size_label.innerText = "Gap";
    node_size.appendChild(gap_size_label);

    const MIN_GAP = 5;
    const MAX_GAP = 25;

    let gap_size_input = create_element("input", ["secondary"]);
    gap_size_input.type = "number";
    gap_size_input.min = MIN_GAP;
    gap_size_input.max = MAX_GAP;
    gap_size_input.value = GAP;
    node_size.appendChild(gap_size_input);

    gap_size_input.oninput = function () {
        let new_size = gap_size_input.value;
        if (new_size >= MIN_GAP && new_size <= MAX_GAP) {
            GAP = new_size;
            document.getElementById("sheet").resize();
            resize_all_nodes();
        }
    };

    return panel;
}

function resize_node(node) {
    no_transition(
        node,
        () => {
            node.style.width = `${node_size(node.width)}px`;
            node.style.height = `${node_size(node.height)}px`;
        }
    );
}

function resize_all_nodes() {
    document.getElementById("sheet").querySelectorAll(".node").forEach(
        resize_node
    );
}

function create_node(w, h, type = "text", add_to_sheet = true) {
    let node = create_element("div", ["node"]);
    node.width = w;
    node.height = h;
    resize_node(node);

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
                    function (_) {
                        node_settings(node);
                    },
                    false
                ],
                [
                    "cross.png",
                    "Delete",
                    function (_) {
                        node.remove()
                    },
                    true
                ],
                [
                    "clone.png",
                    "Clone",
                    function (_) {
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

    if (add_to_sheet) {
        document.getElementById("sheet").appendChild(node);
        position_node(node);
    }

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
    content.add_item = null;

    NODE_TYPES.forEach(c => {
        content.classList.remove(c);
        node.classList.remove(c + "_content");
    });
    
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
        
        function add_item(is_break, text = "") {
            let new_item = is_break ? create_list_break(text ? text : "Break")
                : create_list_item(text ? text : "New item");
            new_item.style.order = content.children.length;
            content.appendChild(new_item);
        }
        content.add_item = add_item;

        content.clear_items = () => {
            content.querySelectorAll(".list_item").forEach(e => {
                e.remove();
            });
        };

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
                    function (_) {
                        add_item(false);
                    }
                ],
                [
                    "handle.png",
                    "Break",
                    function (_) {
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
    else if (type === "image") {
        content.classList.add("image_holder");
        content.innerHTML = "";
        content.contentEditable = false;

        let image = document.createElement("img");
        image.src = icon_path("cross.png");
        content.appendChild(image);
    }
    else if (type === "checkbox") {
        content.classList.add("checkbox_holder");
        content.innerHTML = "";
        content.contentEditable = false;
        content.appendChild(create_checkbox(true, ["inverted"]));
    }

    node.type = type;
    node.classList.add(type + "_content");
}

function set_list_content_from_dict(node, dict) {
    let content = node.querySelector(".content"); 
    content.clear_items();
    dict["entries"].forEach(item => {
        if (item[0] == '_') {
            content.add_item(true, item.slice(1));
        }
        else {
            content.add_item(false, item);
        }
    });

    if ("checkboxes_active" in node.classList) {
        content.classList.remove("checkboxes_active");
    }

    if (dict["checkboxes"]) {
        content.classList.add("checkboxes_active");
    }

    node.querySelector(".title").innerHTML = dict["title"];
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
            
            let text = i.querySelector(".list_item_content:not(.title)");
            if (text) {
                text.contentEditable = editable;
            } 
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

function create_list_item(content = "New item") {
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

function create_list_break(title = "Break") {
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

function create_checkbox(checked = true, classes = []) {
    let checkbox = document.createElement("div");
    checkbox.classList.add("checkbox");
    if (checked) {
        checkbox.classList.add("checked");
    }
    classes.forEach(c => {
        checkbox.classList.add(c);
    });
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

function create_label(content = "New label") {
    let label = create_element("span", ["label"]);
    label.innerHTML = content;
    return label;
}

function node_size(k) {
    return k * NODESIZE + (k - 1) * GAP;    
}

function node_settings(node) {
    let settings = node.querySelector(".settings"); 
    if (!settings) {
        settings = create_node_settings(node); 
    }

    settings.show();
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
    width_input.min = "1";
    width_input.value = node.width.toString();
    width_input.oninput = function () {
        let new_width = parseInt(width_input.value, 10);
        new_width = Math.min(new_width, document.getElementById("sheet").width);
        if (new_width > 0) /* NaN > 0 === false */ {
            node.width = new_width;
            node.style.width = node_size(new_width) + "px";
            no_transition(node, () => { snap_to_grid(node) });

            let ghost = node.querySelector(".node_ghost");
            if (ghost) {
                ghost.set_dimensions(new_width, -1);
            }
        }
    };
    dimensions.appendChild(width_input);

    let height_label = document.createElement("span");
    height_label.classList.add("label");
    height_label.innerHTML = "Height";
    dimensions.appendChild(height_label);

    let height_input = document.createElement("input");
    height_input.type = "number";
    height_input.min = "1";
    height_input.value = node.height.toString();
    height_input.oninput = function () {
        let new_height = parseInt(height_input.value);
        if (new_height > 0) /* NaN > 0 === false */ {
            node.height = new_height;
            node.style.height = node_size(new_height) + "px";
            no_transition(node, () => { snap_to_grid(node) });

            let ghost = node.querySelector(".node_ghost");
            if (ghost) {
                ghost.update(-1, node_size(new_height));
            }
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
    NODE_TYPES.forEach(t => {
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
    font.classList.add("setting", "font_content");
    settings.appendChild(font);

    let font_label = document.createElement("span");
    font_label.classList.add("label");
    font_label.innerHTML = "Font size";
    font.appendChild(font_label);

    let font_input = document.createElement("input");
    font_input.type = "number";
    font_input.value = parseInt(content.style.fontSize).toString();
    font_input.oninput = function () {
        let new_size = Math.max(0, font_input.value);
        if (new_size >= 0) {
            content.style.fontSize = new_size + "pt";
        }
    };
    font.appendChild(font_input);

    let list_options = create_element("div", ["setting", "list_content"]);
    settings.appendChild(list_options);

    list_options.appendChild(create_label("Checkboxes"))

    let checkboxes_input = document.createElement("input");
    checkboxes_input.type = "checkbox";
    checkboxes_input.checked = content.classList.contains("checkboxes_active");
    checkboxes_input.onclick = function () {
        content.classList.toggle("checkboxes_active");
    };
    list_options.appendChild(checkboxes_input);

    list_options.appendChild(create_label("Presets"));
    let preset_dropdown = create_element("select");
    ["None", "Skills"].forEach(t => {
        let option = create_element("option");
        option.innerHTML = t;
        preset_dropdown.appendChild(option);
    });
    preset_dropdown.onchange = () => {
        set_list_content_from_dict(
            node,
            CONTENT["list_presets"][preset_dropdown.value]
        );
    };
    list_options.appendChild(preset_dropdown);

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

    let image_src = create_element("div", ["setting", "image_content"]);
    settings.appendChild(image_src);

    let image_src_label = create_element("span", ["label"]);
    image_src_label.innerHTML = "Image";
    image_src.appendChild(image_src_label);
    
    let image_src_input = create_element("input");
    let image = content.querySelector("img");
    if (image) {
        image_src_input.value = image.src;    
    }
    else {
        image_src_input.value = icon_path("cross.png");
    }
    image_src_input.oninput = function () {
        let img = create_element("img");
        let src = image_src_input.value;

        img.onload = function () {
            let image = content.querySelector("img");
            image.src = src;
            img.onload = null;
            image_src_input.setCustomValidity("");
        };

        img.onerror = function () {
            image_src_input.setCustomValidity("Image not found.");
        }

        img.src = src;
    };
    image_src_input.onblur = function () {
        image_src_input.setCustomValidity("");
        image_src_input.content = content.querySelector("img").src;
    };
    image_src.appendChild(image_src_input);

    let image_src_upload = create_element("div", ["control", "input_holder"]);
    image_src.appendChild(image_src_upload);

    let image_src_upload_img = create_element("img", ["icon", "background"]);
    image_src_upload_img.src = icon_path("up.png");
    image_src_upload.appendChild(image_src_upload_img);

    let image_src_upload_input = create_element("input");
    image_src_upload_input.title = "Upload image";
    image_src_upload_input.type = "file";
    image_src_upload_input.accept = "image/*";
    image_src_upload.appendChild(image_src_upload_input);
    image_src_upload_input.oninput = function () {
        let file = image_src_upload_input.files[0];
        let file_reader = new FileReader();
        file_reader.onloadend = function () {
            let image = content.querySelector("img"); 
            image.src
                = window.URL.createObjectURL(new Blob([file_reader.result]));
            
            // ensure a unique image_name, so that it isn't overwritten in db
            let image_names = document.getElementById("save_menu").image_names;
            if (image_names.indexOf(file.name) >= 0) {
                name = file.name.replace(/\.\w+$/, "");
                ext = file.name.replace(/^\w+/, "");

                let i = 1;
                while (image_names.indexOf(`${name}${i}${ext}`) >= 0) {
                    i += 1;
                }
                image.image_name = `${name}${i}${ext}`;
            }
            else {
                image.image_name = file.name;
            }

            image_src_input.value = image.image_name;
        };
        file_reader.readAsArrayBuffer(file);
    };

    let image_mode = document.createElement("div");
    image_mode.classList.add("setting", "image_content");
    settings.appendChild(image_mode);

    let image_mode_label = document.createElement("span");
    image_mode_label.classList.add("label");
    image_mode_label.innerHTML = "Cropping";
    image_mode.appendChild(image_mode_label);

    let image_mode_dropdown = document.createElement("select");
    ["contain", "cover", "fill"].forEach(m => {
        let option = document.createElement("option");
        option.innerHTML = m;
        image_mode_dropdown.appendChild(option);
    });
    image_mode_dropdown.value = "cover";
    image_mode_dropdown.onchange = function () {
        let image = content.querySelector("img");
        image.style.objectFit = image_mode_dropdown.value;
    };
    image_mode.appendChild(image_mode_dropdown);

    function click_off_settings (e) {
        if (e.target == settings || settings.contains(e.target)) {
            return;
        }
        settings.style.display = "none";
        window.removeEventListener("mousedown", click_off_settings);
    }

    settings.show = () => {
        settings.style.display = "block";
        window.addEventListener("mousedown", click_off_settings);
    };

    settings.onclick = e => {
        e.stopPropagation();
    };

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
    menu.image_names = []; 

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

    let save_list = create_element("div", ["entry_list"]);
    menu.appendChild(save_list);

    function reload_saves() {
        save_list.querySelectorAll(".list_item").forEach(e => {
            e.remove();
        });

        get_all_sheets(data => {
            menu.image_names = update_image_store(data);
            data.sort((a, b) => b.time - a.time);
            data.forEach(save_file => {
                save_list.appendChild(create_save_list_item(save_file, () => {
                    header_input.value = save_file.title;
                }));
            });
        });
    }
    menu.reload_saves = reload_saves;

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

    let title = create_element("span", ["item_title", "label"]);
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

function create_context_menu(parent, item_tuples, visible=false, left=false) {
    let menu = document.createElement("div");
    menu.classList.add("menu");
    parent.appendChild(menu);

    item_tuples.forEach(tuple => {
        let [icon_name, title, func, toggled] = tuple;        

        let item = create_element("div", ["menuitem"]);
    
        let icon = create_element("img", ["icon", "background"]);
        icon.src = icon_path(icon_name);
        item.appendChild(icon);
    
        let label = create_element("span", ["label"]);
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

    if (visible) {
        menu.show();        
    }
    else {
        menu.style.visibility = "hidden";
    }

    if (left) {
        menu.classList.add("left");
    }
}

function parent_node_locked(el) {
    while (!el.classList.contains("node")) {
        el = el.parentNode;
    }

    return el.classList.contains("locked");
}

function make_double_click_editable(el) {
    el.contentEditable = "false";
    el.spellcheck = "false";
    el.tabIndex = "0";

    el.ondblclick = function () {
        if (parent_node_locked(el)) {
            return;
        }

        el.spellcheck = "true";
        el.contentEditable = "true";
        el.focus();

        el.onblur = function () {
            el.spellcheck = "false";
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

function create_node_ghost(node = null, width = 2, height = 2) {
    let ghost = create_element("div", ["node_ghost", "rounded", "offset"]);

    ghost.update = function (new_width, new_height) {
        if (new_width >= 0) {
            ghost.style.width = new_width + 4 + "px";
            resize_to_grid(ghost, true, false, 4);
        }
        if (new_height >= 0) {
            ghost.style.height = new_height + 4 + "px";
            resize_to_grid(ghost, false, true, 4);
        }
    };

    ghost.set_dimensions = (w, h) => {
        ghost.width = w;
        ghost.height = h;
        ghost.update(node_size(w), node_size(h));
    };

    if (node) {
        node.appendChild(ghost);
        ghost.width = node.width;
        ghost.height = node.height;
        ghost.style.width = parseInt(node.style.width, 10) + 4 + "px";
        ghost.style.height = parseInt(node.style.height, 10) + 4 + "px";
    }
    else {
        document.getElementById("sheet").appendChild(ghost);
        ghost.width = width;
        ghost.height = height;
        ghost.style.width = node_size(width) + 4 + "px";
        ghost.style.height = node_size(height) + 4 + "px";
    }

    return ghost;
}

function create_node_group(from_ghost = null, x = 0, y = 0, w = 0, h = 0) {
    if (from_ghost != null) {
        x = x ? x : from_ghost.x;
        y = y ? y : from_ghost.y;
        w = w ? w : from_ghost.width;
        h = h ? h : from_ghost.height;
    }

    let group = create_node_ghost(null, w, h);
    group.classList.remove("node_ghost");
    group.classList.add("node_group");
    let handle = create_control("handle.png", "handle");
    group.appendChild(handle);

    snap_to_grid(group, x, y);
    let sheet = document.getElementById("sheet");
    sheet.appendChild(group);

    group.collect_nodes = function () {
        group.managed_nodes = [];
        let [x1, x2, y1, y2] = parse_grid_area(group);
        sheet.querySelectorAll(".node").forEach(n => {
            let [nx1, nx2, ny1, ny2] = parse_grid_area(n);

            if (x1 <= nx1 && x2 >= nx2 && y1 <= ny1 && y2 >= ny2) {
                group.managed_nodes.push(n);
                n.dx = nx1 - x1;
                n.dy = ny1 - y1;
            }
        });
    }

    make_node_draggable(
        group,
        () => {
            group.collect_nodes();
            group.managed_nodes.forEach(n => { n.style.opacity = 0.5; })
        },
        () => {
            let [x1, _, y1, __] = parse_grid_area(group);
            group.managed_nodes.forEach(n => {
                n.style.gridColumn = (x1 + n.dx).toString() + "/" +
                    (x1 + n.dx + n.width).toString();
                n.style.gridRow = (y1 + n.dy).toString() + "/" +
                    (y1 + n.dy + n.height).toString();
                n.style.opacity = 1;
            });
        }
    );
}

function placement_click_to_grid_coord(e, ghost) {
    let rect = document.getElementById("sheet").getBoundingClientRect();
    offset_x = e.clientX - rect.left;
    offset_y = e.clientY - rect.top;

    return sheet_offset_to_grid_coord(
        offset_x,
        offset_y,
        ghost.width == 1 ? 0.5 : 0,
        ghost.height == 1 ? 0.5 : 0      
    );
}

function create_preview_ghost(width = 2, height = 2) {
    let ghost = create_node_ghost(null, width, height);
    ghost.style.display = "none";

    ghost.pin = null;

    ghost.set_pin = (e) => {
        ghost.pin = placement_click_to_grid_coord(e, ghost);
    };

    function move_ghost(e) {
        if (e.target != sheet && e.target != ghost) {
            ghost.style.display = "none";
            return;
        }
        else {
            ghost.style.display = "block";
        }

        let [x, y] = placement_click_to_grid_coord(e, ghost);

        if (ghost.pin !== null) {
            let [l, t] = ghost.pin;

            ghost.set_dimensions(
                Math.max(Math.abs(x - l), 1) + (x > l ? 1 : 0),
                Math.max(Math.abs(y - t), 1) + (y > t ? 1 : 0)
            );

            x = Math.min(x, l - 1) + 1;
            y = Math.min(y, t - 1) + 1;
        }

        snap_to_grid(ghost, x, y);
        ghost.x = x;
        ghost.y = y;
    }

    function hide_ghost(e) {
        if (e.target != ghost) {
            ghost.style.display = "none";
        }
    }
    
    let sheet = document.getElementById("sheet");

    ghost.start_preview = _ => {
        ghost.style.display = "block";
        sheet.addEventListener("mousemove", move_ghost);
        sheet.addEventListener("mouseleave", hide_ghost);
    };

    ghost.end_preview = _ => {
        ghost.pin = null;
        ghost.style.display = "none";
        sheet.removeEventListener("mousemove", move_ghost);
        sheet.removeEventListener("mouseleave", hide_ghost);
    }

    return ghost;
}

function make_node_resizeable(node) {
    node.resize = function () {
        create_node_ghost(node);

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

        node.classList.add("resizing");
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
            node.classList.remove("resizing");
        }
        catch {

        }
    }

    node.resizing = false;
}

function make_resize_handle_draggable(el, node) {
    let dv = 0, mv = 0;
    let x_direction = el.classList.contains("left") 
        || el.classList.contains("right");
    let ghost = node.querySelector(".node_ghost");

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
        mv = x_direction ? e.clientX : e.clientY;
        
        document.onmouseup = end_drag;
        document.onmousemove = drag;
    }

    function drag(e) {
        e.preventDefault();

        dv = mv - (x_direction ? e.clientX : e.clientY);
        mv = x_direction ? e.clientX : e.clientY;

        if (x_direction) {
            let new_width = 
                Math.max(parseInt(node.style.width) - dv, NODESIZE);
            if (new_width != NODESIZE) {
                el.style.left = (el.offsetLeft - dv) + "px";
            }

            no_transition(node, () => {
                node.style.width = new_width + "px";
            });

            ghost.update(new_width, -1);
        }
        else {
            let new_height = 
                Math.max(parseInt(node.style.height, 10) - dv, NODESIZE);
            if (new_height != NODESIZE) {
                el.style.top = (el.offsetTop - dv) + "px";
            }

            no_transition(node, () => {
                node.style.height = new_height + "px";
            });

            ghost.update(-1, new_height);
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

function resize_to_grid(el, x=true, y=true, margin=0) {
    if (x) {
        let current_width = parseInt(el.style.width);
        el.width = Math.max(Math.round(current_width / (NODESIZE + GAP)), 1);
        el.style.width = (node_size(el.width) + margin) + "px";    
    }

    if (y) {
        let current_height = parseInt(el.style.height);
        el.height = Math.max(Math.round(current_height / (NODESIZE + GAP)), 1);
        el.style.height = (node_size(el.height) + margin) + "px";    
    }
}

function add_node_to_sheet(e) {
    create_node(2, 2);    
}

function make_node_draggable(el, start_fn = null, end_fn = null) {
    let x1 = 0, y1 = 0, x2 = 0, y2 = 0;

    handle = el.querySelector(".handle");
    handle.onmousedown = start_drag;

    function start_drag(e) {
        e.preventDefault();

        if (start_fn !== null) {
            start_fn();
        }

        let top = el.offsetTop;
        let left = el.offsetLeft;

        el.style.position = "absolute";
        el.style.top = top + "px";
        el.style.left = left + "px";
        el.style.gridArea = "";

        x2 = e.clientX;
        y2 = e.clientY;

        document.addEventListener("mouseup", end_drag);
        document.addEventListener("mousemove", drag);
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
        document.removeEventListener("mouseup", end_drag);
        document.removeEventListener("mousemove", drag);

        snap_to_grid(el);

        if (end_fn !== null) {
            end_fn();
        }
    }
}

function snap_to_grid(e, x = null, y = null) {
    if (x == null) {
        x = Math.round(e.offsetLeft / (NODESIZE + GAP)) + 1;
    }
    if (y == null) {
        y = Math.round(e.offsetTop / (NODESIZE + GAP)) + 1;
    }

    x = Math.max(x, 1);
    y = Math.max(y, 1);

    let sheet = document.getElementById("sheet");
    if (y > sheet.height) {
        sheet.height = y + e.height;
        sheet.resize();
    }

    while (x + e.width - 1 > sheet.width) {
        x--;
    }

    e.style.top = "";
    e.style.left = "";
    e.style.position = "relative";

    e.style.gridColumn = x + "/" + (x + parseInt(e.width));
    e.style.gridRow = y + "/" + (y + parseInt(e.height));
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

function set_document_title(text = "") {
    document.title = "chsheet: " + text;
}

function create_element(tagname, classes) {
    let el = document.createElement(tagname);

    if (classes) {
        classes.forEach(c => {
            el.classList.add(c);
        });
    }

    return el;
}

function sheet_offset_to_grid_coord(off_x, off_y, delta_x = 0, delta_y = 0) {    
    return [
        Math.round(off_x / (NODESIZE + GAP) + delta_x),
        Math.round(off_y / (NODESIZE + GAP) + delta_y)
    ];
}
