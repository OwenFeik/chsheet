const INITIAL_GRID_SIZE = 32;
const INITIAL_GRID_GAP = 10;
const TOOLBAR_WIDTH = 70;
const NODE_HEADER_HEIGHT = 20;
const LIST_ITEM_HEIGHT = 29;
const NODE_TYPES = ["text", "number", "list", "die", "image", "checkbox"];

const NodeTypes = {
    CHECKBOX: "checkbox",
    DIE: "die",
    IMAGE: "image",
    LIST: "list",
    NONE: "none",
    NUMBER: "number",
    TEXT: "text",
};

class ElementWrapper {
    constructor(tagname, classes) {
        this.element = create_element(tagname, classes);
    }

    remove() {
        this.element.remove();
    }

    add_listener(event, func) {
        this.element.addEventListener(event, func);
    }

    remove_listener(event, func) {
        this.element.removeEventListener(event, func);
    }
}

class VisibilityManagedWrapper extends ElementWrapper {
    constructor(tagname, classes) {
        super(tagname, classes);

        this._visible = true;
        this.visible = true;
    }

    get visible() {
        return this._visible;
    }

    set visible(visible) {
        if (typeof visible !== "boolean") {
            return;
        }

        this._visible = visible;

        if (this._visible) {
            this.element.style.display = null;            
        }
        else {
            this.element.style.display = "none";
        }
    }

    _hide() {
        this.visible = false;
    }

    hide() {
        this._hide();
    }

    _show() {
        this.visible = true;
    }

    show() {
        this._show();
    }
}

class GridElement extends ElementWrapper {
    static GRID_SIZE_INITIAL = 32;
    static GRID_SIZE_MIN = 10;
    static GRID_SIZE_MAX = 100;
    static GRID_GAP_INITIAL = 10;
    static GRID_GAP_MIN = 5;
    static GRID_GAP_MAX = 25;

    constructor(tagname, classes, options) {
        super(tagname, classes);

        this._width = options?.width || 2;
        this._height = options?.height || 2;

        GridElement.grid_elements.push(this);
    }

    static grid_size = GridElement.GRID_SIZE_INITIAL;
    static grid_gap = GridElement.GRID_GAP_INITIAL;

    // A list of all existing grid_elements is stored such that they can be
    // each be resized to update the grid dimensions.
    static grid_elements = [];

    static set_grid_size(val) {
        GridElement.grid_size = Math.max(
            Math.min(val, GridElement.GRID_SIZE_MAX),
            GridElement.GRID_SIZE_MIN
        );
        GridElement.grid_elements.forEach(e => e.resize());
    }

    static set_grid_gap(val) {
        GridElement.grid_gap = Math.max(
            Math.min(val, GridElement.GRID_GAP_MAX),
            GridElement.GRID_GAP_MIN
        );
        GridElement.grid_elements.forEach(e => e.resize());
    }

    static grid_size_to_px(size, as_string = true) {
        let px = (
            size * GridElement.grid_size
            + (size - 1) * GridElement.grid_gap
        );
        
        if (as_string) {
            return px + "px";
        }
        return px;
    }

    static px_to_grid_size(px) {
        return Math.round(
            parseInt(px)
            / (GridElement.grid_size + GridElement.grid_gap)
        );
    }

    static offset_to_grid_size(off_x, off_y, delta_x = 0, delta_y = 0) {
        return [
            Math.max(
                Math.round(
                    off_x
                    / (GridElement.grid_size + GridElement.grid_gap)
                    + delta_x
                ),
                0
            ),
            Math.max(
                Math.round(
                    off_y
                    / (GridElement.grid_size + GridElement.grid_gap)
                    + delta_y
                ),
                0
            )
        ];
    }

    get width() {
        return this._width;
    }

    set width(val) {
        this._width = val;
        this.resize();
    }

    get height() {
        return this._height;
    }

    set height(val) {
        this._height = val;
        this.resize();
    }

    get w() {
        return this._width;
    }

    set w(val) {
        this._width = val;
        this.resize();
    }

    get h() {
        return this._height;
    }

    set h(val) {
        this._height = val;
        this.resize();
    }

    _resize() {
        this.element.style.width = GridElement.grid_size_to_px(this.width);
        this.element.style.height = GridElement.grid_size_to_px(this.height);
    }

    // Subclasses will be non-abstract, and may want to update grid area or
    // similar when resized, rather than just dimensions.
    resize() {
        this._resize();
    }

    contains(other) {
        return (
            this.x <= other.x
            && this.y <= other.y
            && this.x + this.w >= other.x + other.w
            && this.y + this.h >= other.y + other.h
        );
    }
}

class SheetElement extends VisibilityManagedWrapper {
    constructor(tagname, classes, options) {
        super(tagname, classes);

        this._x = options?.x || 0;
        this._y = options?.y || 0;
        this._w = options?.width || options?.w || 2;
        this._h = options?.height || options?.h || 2;

        this.update_grid_area();
    
        if (options?.sheet) {
            this.add_to_sheet(options.sheet);
        }

        this.removed = false;

        this.dimension_handler = options?.dimension_handler || null;
    }

    get x() {
        return this._x;
    }

    set x(val) {
        this._x = val;
        this.resize();
    }

    get y() {
        return this._y;
    }

    set y(val) {
        this._y = val;
        this.resize();
    }

    get w() {
        return this._w;
    }

    set w(val) {
        this._w = val;
        this.resize();
    }

    get width() {
        return this._w;
    }

    set width(val) {
        this.w = val;
    }

    get h() {
        return this._h;
    }

    set h(val) {
        this._h = val;
        this.resize();
    }

    get height() {
        return this._h;
    }

    set height(val) {
        this.h = val;
    }

    add_to_sheet(sheet) {
        sheet.add_element(this);
    }

    remove_from_sheet() {
        this.sheet?.remove_element(this);
    }

    remove() {
        if (this.removed) {
            return;
        }

        this.remove_from_sheet();
        this.element.remove();
        this.removed = true;
    }

    resize() {
        this.update_grid_area();
        if (this.dimension_handler) {
            this.dimension_handler();
        }

        if (this.sheet) {
            if (this.y + this.h >= sheet.h) {
                sheet.h = this.y + this.h;
            }

            if (this.x + this.w >= sheet.w) {
                sheet.w = this.x + this.w;
            }
        }
    }
    
    update_grid_area() {
        this.element.style.gridRowStart = this.y + 1;
        this.element.style.gridRowEnd = this.y + this.height + 1;
        this.element.style.gridColumnStart = this.x + 1;
        this.element.style.gridColumnEnd = this.x + this.width + 1;
    }

    contains(other) {
        return (
            (this.x <= other.x)
            && (this.x + this.width >= other.x + other.width)
            && (this.y <= other.y)
            && (this.y + this.height >= other.y + other.height)
        );
    }

    to_json() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
}

class DraggableSheetElement extends SheetElement {
    // This class doesn't encode any persistent data, but it powers the
    // front-end actions of resizing and moving about nodes and groups.

    constructor(classes, options) {
        super("div", classes, options);

        this._transforming = false;

        // When the user mousedowns on the drag target we prime for a drag.
        // However we don't actually begin the drag until they move the mouse
        // without releasing (and thus depriming).
        this.drag_primed = false;
        this.pos_x = this.pos_y = null;
        this.drag_ghost = null;
        this.drag_target = this.element;
        this.drag_valid = options?.drag_valid || (() => true);

        this.resize_primed = false;
        this._resizing = false;
        this.resize_ghost = null;
        this.resize_handles = null;
        this.resize_context_menu_entry = null;

        this.add_listener("mousedown", e => this.handle_mouse_down(e));
        
        this.drag_mouse_up = e => this.handle_mouse_up(e);
        this.drag_mouse_move = e => this.handle_mouse_move(e);
    }

    get transforming() {
        return this._transforming;
    }

    set transforming(bool) {
        this._transforming = bool;

        if (this._transforming) {
            this.element.style.width = this.element.offsetWidth + "px";
            this.element.style.height = this.element.offsetHeight + "px";
            this.element.style.position = "absolute";
            this.element.style.top = this.element.offsetTop + "px";
            this.element.style.left = this.element.offsetLeft + "px";
            this.element.style.gridArea = "";
        }
        else {
            [this.x, this.y] = GridElement.offset_to_grid_size(
                this.element.offsetLeft, this.element.offsetTop
            );

            this.element.style.width = "";
            this.element.style.height = "";
            this.element.style.position = "";
            this.element.style.top = "";
            this.element.style.left = "";
        }
    }

    start_drag(e) {
        this.transforming = true;

        this.pos_x = e.screenX;
        this.pos_y = e.screenY;

        this.drag_ghost = NodeGhost.from_node(this);

    }

    end_drag() {
        this.transforming = false;

        this.pos_x = this.pos_y = null;

        this.drag_ghost.remove();
        this.drag_ghost = null;
    }

    handle_mouse_down(e) {
        if (
            e.which === 1
            && this.drag_valid() 
            && (
                e.target === this.drag_target
                || this.drag_target.contains(e.target)
            )
        ) {            
            this.drag_primed = true;
            document.addEventListener("mouseup", this.drag_mouse_up);
            document.addEventListener("mousemove", this.drag_mouse_move);
        }
    }

    handle_mouse_up(e) {
        if (this.transforming) {
            this.end_drag();
        }

        this.drag_primed = false;
        document.removeEventListener("mouseup", this.drag_mouse_up);
        document.removeEventListener("mousemove", this.drag_mouse_move);
    }

    handle_mouse_move(e) {
        if (!this.transforming) {
            if (this.drag_primed) {
                this.start_drag(e);
            }
            else {
                return;
            }
        }

        no_transition(this.element, () => {
            this.element.style.left = (
                this.element.offsetLeft + e.screenX - this.pos_x
            ) + "px";
            this.element.style.top = (
                this.element.offsetTop + e.screenY - this.pos_y
            ) + "px";    
        });

        [
            this.drag_ghost.x,
            this.drag_ghost.y
        ] = GridElement.offset_to_grid_size(
            this.element.offsetLeft, this.element.offsetTop
        );

        this.pos_x = e.screenX;
        this.pos_y = e.screenY;
    }

    create_resize_handles() {
        this.resize_handles = [
            {
                element: create_element("div", ["resize_handle", "left"]),
                dx: -1,
                dy: 0
            },
            {
                element: create_element("div", ["resize_handle", "top_left"]),
                dx: -1,
                dy: -1
            },
            {
                element: create_element("div", ["resize_handle", "top"]),
                dx: 0,
                dy: -1
            },
            {
                element: create_element("div", ["resize_handle", "top_right"]),
                dx: 1,
                dy: -1
            },
            {
                element: create_element("div", ["resize_handle", "right"]),
                dx: 1,
                dy: 0
            },
            {
                element: create_element(
                    "div", ["resize_handle", "bottom_right"]
                ),
                dx: 1,
                dy: 1
            },
            {
                element: create_element("div", ["resize_handle", "bottom"]),
                dx: 0,
                dy: 1
            },
            {
                element: create_element(
                    "div", ["resize_handle", "bottom_left"]
                ),
                dx: -1,
                dy: 1
            }
        ];

        this.resize_handles.forEach(handle => {
            let anchor_x, anchor_y;
            let width, height;
            let left, top;

            let handle_mouse_move = e => {
                if (handle.dx) {
                    let delta_x = e.screenX - anchor_x;  
                    let new_width = Math.max(
                        delta_x * handle.dx + width, GridElement.grid_size
                    );
                    let new_left = left + (
                        handle.dx == -1
                        ? Math.min(delta_x, width - GridElement.grid_size)
                        : 0
                    );

                    no_transition(this.element, () => {
                        this.element.style.width = new_width + "px";
                        this.element.style.left = new_left + "px";
                        this.resize_ghost.width = GridElement.px_to_grid_size(
                            new_width
                        );
                        this.resize_ghost.x = GridElement.px_to_grid_size(
                            new_left
                        );
                    });
                }

                if (handle.dy) {
                    let delta_y = e.screenY - anchor_y;  
                    let new_height = Math.max(
                        delta_y * handle.dy + height, GridElement.grid_size
                    );
                    let new_top = top + (
                        handle.dy == -1
                        ? Math.min(delta_y, height - GridElement.grid_size)
                        : 0
                    );
                    
                    no_transition(this.element, () => {
                        this.element.style.height = new_height + "px";
                        this.element.style.top = new_top + "px";
                        this.resize_ghost.height = GridElement.px_to_grid_size(
                            new_height
                        );
                        this.resize_ghost.y = GridElement.px_to_grid_size(
                            new_top
                        );
                    });
                }
            };

            let handle_mouse_up = e => {
                // TODO sometimes jumps a tile when the width rounds down
                // but the x pos rounds up (or vertically)

                let new_width = GridElement.px_to_grid_size(
                    this.element.style.width
                );
                let new_height = GridElement.px_to_grid_size(
                    this.element.style.height
                );

                this.transforming = false;
                
                this.width = new_width;
                this.height = new_height;

                document.removeEventListener("mousemove", handle_mouse_move);
                document.removeEventListener("mouseup", handle_mouse_up);
            };
            
            handle.element.onmousedown = e => {
                if (!this.resize_primed) {
                    return;
                }

                e.stopPropagation();

    
                if (!this.transforming) {
                    this.transforming = true;
                }

                anchor_x = e.screenX;
                anchor_y = e.screenY;
                width = parseInt(this.element.style.width);
                height = parseInt(this.element.style.height);
                left = parseInt(this.element.style.left);
                top = parseInt(this.element.style.top);

                document.addEventListener("mousemove", handle_mouse_move);
                document.addEventListener("mouseup", handle_mouse_up);
            };
    
            this.element.appendChild(handle.element);
        });
    }

    start_resize() {
        this.resize_context_menu_entry.title = "End resize";

        this.resize_primed = true;
        this.element.classList.add("resizing");

        if (this.resize_handles === null) {
            this.create_resize_handles();
        }

        if (this.resize_ghost === null) {
            this.resize_ghost = NodeGhost.from_node(this);
        }

        Object.values(this.resize_handles).forEach(handle => {
            handle.element.style.display = "block";
        });
        this.resize_ghost.visible = true;
    }

    end_resize() {
        this.resize_context_menu_entry.title = "Resize";

        this.resize_primed = false;
        this.element.classList.remove("resizing");

        if (this.resize_handles) {
            this.resize_handles.forEach(handle => {
                handle.element.style.display = "none";
            });    
        }

        if (this.resize_ghost) {
            this.resize_ghost.visible = false;
        }
    }

    add_resize_context_menu_item() {
        if (!this.menu) {
            console.error(
                "add_resize_context_menu_item called on object with no context "
                + "menu."
            )
            return;
        }

        this.resize_context_menu_entry = new ContextMenuEntry(
            "resize.png",
            "Resize",
            _ => {
                if (!this.resize_primed) {
                    this.start_resize();
                }
                else {
                    this.end_resize();
                }
            },
            true
        );

        this.menu.add_entry(this.resize_context_menu_entry);
    }
}

class Title extends VisibilityManagedWrapper {
    constructor(options) {
        super("span", ["title"].concat(options?.classes || []));
        
        this._text = "";
        this.text = options?.title || "Title";
        
        this.visible = options?.title_active || true;

        this.locked = options?.locked || false;

        this.make_double_click_editable();
    }

    get text() {
        return this._text;
    }

    set text(text) {
        this._text = text;
        this.element.title = this._text;
        this.element.innerText = this._text;
    }

    make_double_click_editable() {
        let el = this.element;

        el.contentEditable = "false";
        el.spellcheck = "false";
        el.tabIndex = "0";

        el.ondblclick = () => {
            if (this.locked) {
                return;
            }

            el.spellcheck = "true";
            el.contentEditable = "true";
            el.focus();

            el.onblur = () => {
                el.spellcheck = "false";
                el.contentEditable = "false";
                el.scrollLeft = 0;
                el.onblur = null;
            };
        };

        this.add_listener("input", e => { this.text = this.element.innerText });
    }
}

class Icon extends ElementWrapper {
    constructor(name, background = true) {
        super("img", ["icon"]);

        this.element.setAttribute("draggable", false);

        this._icon_name = null;
        this.icon_name = name; 
        
        if (background) {
            this.element.classList.add("background");
        }
    }

    get icon_name() {
        return this._icon_name;
    }

    set icon_name(val) {
        this._icon_name = val;
        this.element.src = Icon.icon_path(val);
    }

    static icon_path(name) {
        return "icons/" + name;
    }
}

class Checkbox extends ElementWrapper {
    constructor(checked = true, classes = [], background = true) {
        super(
            "div",
            ["checkbox"]
                .concat(classes)
                .concat(background ? ["background"] : [])
        );

        this.element.appendChild(new Icon("tick.png", background).element);

        this._value = null;
        this.value = checked;

        this.element.onclick = () => this.toggle();
        this.oninput = null;
    }

    get value() {
        return this._value;
    }

    set value(checked) {
        this._value = checked;

        if (this._value) {
            this.element.classList.add("checked");
        }
        else {
            this.element.classList.remove("checked");
        }

        if (this.oninput) {
            this.oninput(this.value);
        }
    }

    toggle() {
        this.value = !this.value;
    }
}

class ContextMenuEntry extends ElementWrapper {
    constructor(icon_name, title, func, toggled = false) {
        super("div", ["menuitem"]);

        this.icon = new Icon(icon_name);
        this.element.appendChild(this.icon.element);
    
        this._title = title;
        this.label = create_element("span", ["label"]);
        this.element.appendChild(this.label);
        this.title = this._title;

        if (toggled) {
            this.element.classList.add("toggle");
        }
    
        this.add_listener("click", _ => func(this));
    }

    get title() {
        return this._title;
    }

    set title(val) {
        this._title = val;
        this.label.innerHTML = this._title;
        this.element.title = this._title;
    }
}

class DeleteContextMenuEntry extends ContextMenuEntry {
    constructor(target) {
        super("cross.png", "Delete", () => target.remove(), true);
    }
}

class ContextMenu extends VisibilityManagedWrapper {
    constructor(parent) {
        super("div", ["menu"]);

        this.click_off_handler = e => this.handle_click_off(e);

        parent.element.appendChild(this.element);
        parent.add_listener("contextmenu", e => this.handle_context_menu(e));

        this.hide();
    }

    add_entry(context_menu_entry) {
        this.element.appendChild(context_menu_entry.element);
    }

    handle_click_off(e) {
        if (e.target !== this.element) {
            // If one of this elements entries is clicked, we still want to hide
            // as it will perform its own action.

            this.hide();
        }
    }

    handle_context_menu(e) {
        e.preventDefault();
        e.stopPropagation();
        this.show();
    }

    hide() {
        window.removeEventListener("click", this.click_off_handler);
        this._hide();
    }

    show() {
        window.addEventListener("click", this.click_off_handler);
        this._show();
    }
}

class Control extends VisibilityManagedWrapper {
    constructor(func, options) {
        super("div", ["control"].concat(options.classes || []));
        
        if (options?.toggle) {
            this.element.classList.add("toggle");
        }

        this.icon = new Icon(
            options.icon || options.icon_name,
            options.background !== undefined ? options.background : true
        );
        this.element.appendChild(this.icon.element);

        this.title = options?.title;
        if (this.title) {
            this.element.title = this.title;
        }
    
        this.func = func;
        this.element.onclick = e => this.func(e);
    }
}

class UploadControl extends Control {
    constructor(func, options) {
        super(() => {}, Object.assign(options, {icon_name: "up.png"}));
        this.element.style.position = "relative";
        this.element.appendChild(create_element(
            "input",
            [],
            {
                title: options?.title || "Upload",
                type: "file",
                accept: options?.accept,
                oninput: e => func(e.target.files[0])
            }
        ));
    }
}

class ControlBox extends VisibilityManagedWrapper {
    constructor(options) {
        super("div", ["control_box"].concat(options?.classes || []));

        this.visible = options?.controls_active || true;
        this.controls = [];
    }

    add_control(control) {
        this.controls.push(control);
        this.element.appendChild(control.element);
    }

    set_up_controls() {}

    reverse_order() {
        Array.from(this.element.children).reverse().forEach(el => {
            this.element.appendChild(el);
        });
    }

    get(title) {
        return this.controls.filter(c => c.title === title)[0];
    }
}

class ListItemControl extends Control {
    constructor(list_item, options) {
        super(e => this.action(e), options);

        this.list_item = list_item;
    }
}

class ListItemDragControl extends ListItemControl {
    constructor(list_item) {
        super(list_item, {
            icon: "handle.png",
            toggle: true
        });

        // ListItemControl sets onclick = e => this.action(e), so remove that
        this.element.onclick = null;

        let ymin, list_content;

        let drag = e => {
            e.preventDefault();

            let offset = e.pageY + list_content.scrollTop - ymin;

            let new_index = Math.min(
                Math.max(Math.floor(offset / ListNode.LIST_ITEM_HEIGHT), 0),
                list_content.children.length
            );

            let old_index = this.list_item.style.order;

            Array.from(list_content.children).forEach(item => {
                if (item.style.order == new_index) {
                    item.style.order = old_index;
                }
            });

            this.list_item.style.order = new_index;
        };

        let end_drag = e => {
            document.removeEventListener("mouseup", end_drag);
            document.removeEventListener("mousemove", drag);
        };

        this.element.onmousedown = e => {
            e.preventDefault();

            list_content = this.list_item.parentNode;
            ymin = (
                list_content.getBoundingClientRect().top + window.pageYOffset
            );

            document.addEventListener("mouseup", end_drag);
            document.addEventListener("mousemove", drag);
        };
    }
}

class ListItemRemoveControl extends ListItemControl {
    constructor(list_item) {
        super(list_item, {
            icon: "cross.png",
            toggle: true
        });
    }

    action(event) {
        this.list_item.remove();
    }
}

class ListItemControlBox extends ControlBox {
    constructor(list_item, options) {
        super(options);

        this.list_item = list_item;
        this.set_up_controls();
    }

    set_up_controls() {
        this.add_control(new ListItemRemoveControl(this.list_item));
        this.add_control(new ListItemDragControl(this.list_item));
    }
}

class NodeHeader extends ElementWrapper {
    constructor(node, options) {
        super("div", ["header"]);

        this.title = new Title(options);
        this.element.appendChild(this.title.element);

        this.controls = new ControlBox(options);
        this.element.appendChild(this.controls.element);

        if (options) {
            this.title.visible = options.title_active;
            this.controls.visible = options.controls_active;    
        }
    }
}

class NodeSetting extends VisibilityManagedWrapper {
    // A single setting can have multiple input types (for instance an "active"
    // checkbox and a "value" input). For each handler function provided in the
    // options, a DOM object of the relevant type will be created as part of the
    // setting.
    constructor(options) {
        super("div", ["setting"]);

        this.name = options.name || "";
        this._text = this.name;
        this.label = null;

        this.node_type = options.node_type || null;
        
        this.update_func = options.update || null;
        
        this.checkbox_func = options.checkbox || null;
        this.checkbox = null;

        this.number_func = options.number || null;
        this.number_min = options.min;
        this.number_max = options.max;
        this.number = null;
        
        this.string_func = options.string || null;
        this.string = null;

        this.dropdown_func = options.dropdown || null;
        this.dropdown_entries = options.dropdown_entries || [];
        this.dropdown = null;

        this.set_up_fields();
    }

    get text() {
        return this._text;
    }

    set text(val) {
        this._text = val;

        if (this.label) {
            this.label.innerText = val;
        }
        else if (val) {
            this.label = this.element.appendChild(
                create_element("span", ["label"])
            );
            this.label.innerText = val;
        }
    }

    set_up_fields() {
        if (this.checkbox_func) {
            this.checkbox = new Checkbox(true);
            this.checkbox.oninput = v => this.checkbox_func(v);
            this.element.appendChild(this.checkbox.element);
        }

        if (this._text) {
            this.text = this._text;
        }

        if (this.number_func) {
            this.number = this.element.appendChild(create_element("input", [], {
                type: "number",
                min: this.number_min,
                max: this.number_max
            }));
            this.number.oninput = e => {
                let v = parseInt(e.data);
                if (v === v) {
                    this.number_func(v);
                }
            };
        }

        if (this.string_func) {
            this.string = this.element.appendChild(create_element("input"));
            this.string.oninput = e => {
                let validity = this.string_func(this.string.value);
                if (typeof validity === "string") {
                    this.string.setCustomValidity(validity);
                }
            };
        }

        if (this.dropdown_func) {
            this.dropdown = this.element.appendChild(create_element("select"));
            this.dropdown_entries.forEach(e => {
                this.dropdown.appendChild(create_element(
                    "option",
                    [],
                    { innerText: e }
                ));
            });
            this.dropdown.onchange = e => this.dropdown_func(
                this.dropdown.value
            );
        }
    }

    update() {
        if (this.update_func) {
            let data = this.update_func();
            
            if (this.checkbox && data.checkbox !== undefined) {
                this.checkbox.value = data.checkbox;
            }
            if (this.number && data.number !== undefined) {
                this.number.value = data.number;
            }
            if (this.string && data.string !== undefined) {
                this.string.value = data.string;
            }
            if (this.dropdown && data.dropdown !== undefined) {
                this.dropdown.value = data.dropdown;
            }
            if (data.text !== undefined) {
                this.text = data.text;
            }
        }
    }

}

class MultiSetting extends VisibilityManagedWrapper {
    constructor(settings) {
        super("div", ["setting"]);
        
        this.settings = [];
        settings.forEach(s => this.add_setting(s));
    }

    add_setting(setting) {
        this.settings.push(setting);

        if (setting.checkbox) {
            this.element.appendChild(setting.checkbox.element);
        }

        ["label", "number", "string", "dropdown"].forEach(
            field => {
                if (setting[field]) {
                    this.element.appendChild(setting[field])
                }
            }
        );
    }

    update() {
        this.settings.forEach(s => s.update());
    }
}

class NodeSettings extends VisibilityManagedWrapper {
    constructor(node) {
        super("div", ["settings"]);

        this.click_off_handler = e => this.click_off(e);
        this.element.onclick = e => e.stopPropagation();
        this.settings = [];

        node.element.appendChild(this.element);

        this.hide();
        this.update_settings();
    }

    add_setting(setting) {
        this.settings.push(setting);
        this.element.appendChild(setting.element);
    }

    click_off(e) {
        if (e.target === this.element || this.element.contains(e.target)) {
            return;
        }

        this.hide();
        window.removeEventListener("mousedown", this.click_off_handler);
    }

    update_settings() {
        this.settings.forEach(s => s.update());
    }

    show() {
        this._show();
        this.update_settings();
        window.addEventListener("mousedown", this.click_off_handler);
    }
}

class SheetNode extends DraggableSheetElement {
    static DEFAULT_FONT_SIZE = 10; 

    constructor(options) {
        super(
            ["node"], 
            Object.assign(
                options, { drag_valid: () => { return !this.locked; } }
            )
        );

        this.type = options?.type || NodeTypes.NONE;

        this._locked = options?.locked || false;

        this.replace_func = options?.replace_func || null;
        
        this.header = new NodeHeader(this, options);
        this.element.appendChild(this.header.element);

        this.drag_target = this.header.element;

        this.content = null;
        this.create_content_element();
        this.set_up_content();

        this.menu = null;
        this.set_up_menu();

        this.settings = null;
        this.set_up_settings();

        // Use the font_size specified, or the subclasses font size, falling
        // back to the global default.
        this.font_size = (
            options?.font_size
            || this.constructor.DEFAULT_FONT_SIZE
        );
    }

    get value() {
        return null;
    }

    set value(data) {
        return;
    }

    get locked() {
        return this._locked;
    }

    set locked(val) {
        this._locked = val;

        if (this.locked) {
            this.element.classList.add("locked");
        }
        else {
            this.element.classList.remove("locked");
        }

        this.update_content_editable(this.locked);
    }

    get font_size() {
        if (this.content) {
            return parseInt(this.content.style.fontSize);
        }
        return undefined;
    }

    set font_size(size) {
        if (this.content) {
            this.content.style.fontSize = parseInt(size) + "pt";
        }
    }

    create_content_element() {
        this.content = create_element("div", ["content"]);
        this.element.appendChild(this.content);
    }

    set_up_content() {
        // Subclasses have differing content formats, so they configure the
        // content element when this is called.

        return;
    }

    update_content_editable(editable) {
        this.content.element.contentEditable = editable;
    }

    set_up_menu() {
        this.menu = new ContextMenu(this);

        // this.menu.add_entry(new ContextMenuEntry("resize.png"))
        this.menu.add_entry(new DeleteContextMenuEntry(this));
        this.menu.add_entry(new ContextMenuEntry(
            this.locked ? "unlock.png" : "lock.png",
            this.locked ? "Unlock" : "Lock",
            e => {
                this.locked = !this.locked;
                e.icon.icon_name = this.locked ? "unlock.png" : "lock.png";
                e.title = this.locked ? "Unlock" : "Lock";
            }
        ));
        this.menu.add_entry(new ContextMenuEntry(
            "cog.png", "Settings", _ => this.settings.show()
        ));

        this.add_resize_context_menu_item();
    }

    set_up_settings() {
        this.settings = new NodeSettings(this);

        this.settings.add_setting(new NodeSetting({
            name: "Title",
            checkbox: v => { this.header.title.visible = v },
            string: v => { this.header.title.text = v },
            update: () => {
                return {
                    checkbox: this.header.title.visible,
                    string: this.header.title.text
                };
            } 
        }));
        this.settings.add_setting(new MultiSetting([
            new NodeSetting({
                name: "Controls",
                checkbox: v => { this.header.controls.visible = v },
                update: () => {
                    return { checkbox: this.header.controls.visible };
                }
            }),
            new NodeSetting({
                name: "Content",
                dropdown: v => { this.switch_to_type(v) },
                dropdown_entries: Object.values(NodeTypes),
                update: () => { return { dropdown: this.type }; }
            })
        ]));
        this.settings.add_setting(new MultiSetting([
            new NodeSetting({
                name: "Width",
                number: v => { this.width = v },
                update: () => { return { number: this.width }; }
            }),
            new NodeSetting({
                name: "Height",
                number: v => { this.height = v },
                update: () => { return { number: this.height }; }
            })
        ]));
        this.settings.add_setting(new NodeSetting({
            name: "Font size",
            number: v => { this.font_size = v },
            update: () => { return { number: this.font_size }; } 
        }));
    }

    replace(replacement) {
        if (this.replace_func) {
            this.replace_func(this, replacement);
        }
        else if (this.sheet) {
            this.sheet.replace_element(this, replacement);
        }
        else {
            console.error(
                "SheetNode.replace called when no replace function available."
            );
        }
    }

    clone() {
        return SheetNode.from_json(this.to_json());
    }

    content_to_type(type) {
        return null;
    }

    switch_to_type(type) {
        let json = this.to_json();
        json.content = this.content_to_type(type);
        json.replace_func = this.replace_func;     
        json.type = type;

        let new_node = SheetNode.from_json(json);

        this.replace(new_node);

        // Note: if we ever want to call switch_to_type from somewhere other
        // than settings this will no longer make sense.
        new_node.settings.show();
    }

    content_json() {
        return this.value;
    }

    to_json() {
        return Object.assign(
            super.to_json(),
            {
                title: this.header.title.text,
                title_active: this.header.title.visible,
                type: this.type,
                controls_active: this.header.controls.visible,
                font_size: this.font_size,
                locked: this.locked,
                content: this.content_json()
            }
        );
    }

    static from_json(options) {
        switch (options.type) {
            case NodeTypes.CHECKBOX:
                return new CheckboxNode(options);
            case NodeTypes.DIE:
                return new DieNode(options);
            case NodeTypes.IMAGE:
                return new ImageNode(options);
            case NodeTypes.LIST:
                return new ListNode(options);
            case NodeTypes.NONE:
                return new SheetNode(options);
            case NodeTypes.NUMBER:
                return new NumberNode(options);
            case NodeTypes.TEXT:
                return new TextNode(options);
        }
    }
}

class TextNode extends SheetNode {
    static DEFAULT_VALUE = "Lorem ipsum dolor sit amet";
    static TEXT_ALIGNMENT_OPTIONS = ["left", "right", "center", "justify"];;

    constructor(options) {
        super(options);

        if (options?.content) {
            this.value = options.content;
        }

        this.text_align = options?.text_align || "left";
    }

    get value() {
        return this.content.innerText;
    }

    set value(text) {
        this.content.innerText = text;
    }

    get text_align() {
        return this.content.style.textAlign;
    }

    set text_align(align) {
        this.content.style.textAlign = align;
    }

    set_up_content() {
        this.content.classList.add("text");
        this.value = TextNode.DEFAULT_VALUE;
        this.content.contentEditable = true;
        this.content.spellcheck = false;
    }

    set_up_settings() {
        super.set_up_settings();

        this.settings.add_setting(new NodeSetting({
            name: "Text align",
            dropdown: v => { this.text_align = v; },
            dropdown_entries: TextNode.TEXT_ALIGNMENT_OPTIONS,
            update: () => { return { dropdown: this.text_align }; }
        }));
    }

    to_json() {
        return Object.assign(super.to_json(), { text_align: this.text_align });
    }
}

class NumberNode extends SheetNode {
    static DEFAULT_FONT_SIZE = 20;
    static DEFAULT_VALUE = 1;

    constructor(options) {
        super(options);    

        this.default_value = options?.default_value || NumberNode.DEFAULT_VALUE;
        this.value = this.default_value;

        this.set_up_controls();

        if (options?.content) {
            this.value = options.content;
        }

        this.reset_active = options?.reset_active || false;
    }

    get value() {
        return parseInt(this.content.innerText);
    }

    set value(number) {
        this.content.innerText = number.toString();
    }

    get reset_active() {
        return this.header.controls.get("Reset").visible;
    }

    set reset_active(bool) {
        this.header.controls.get("Reset").visible = bool;
    }

    reset() {
        this.value = this.default_value;
    }

    set_up_content() {
        this.content.classList.add("number");
        this.content.contentEditable = true;
        this.content.spellcheck = false;
        this.content.style.textAlign = "center";

        // Prevent non numeric characters from being entered into number
        // field.
        this.content.onkeydown = e => {
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
    }

    set_up_controls() {
        this.header.controls.add_control(new Control(
            e => {
                this.value = this.value +
                    (e.ctrlKey ? 10 : 1) * (e.shiftKey ? 100 : 1)
            },
            {
                icon: "add.png",
                title: "Increase",
                toggle: true
            }
        ));
        this.header.controls.add_control(new Control(
            e => {
                this.value = this.value -
                    (e.ctrlKey ? 10 : 1) * (e.shiftKey ? 100 : 1)
            },
            {
                icon: "subtract.png",
                title: "Decrease",
                toggle: true
            }
        ));
        this.header.controls.add_control(new Control(
            e => this.reset(),
            {
                icon: "reset.png",
                title: "Reset",
                toggle: true
            }
        ));
    }

    set_up_settings() {
        super.set_up_settings();

        this.settings.add_setting(new MultiSetting([
            new NodeSetting({
                name: "Reset",
                checkbox: v => { this.reset_active = v; },
                update: () => { return { checkbox: this.reset_active }; }
            }),
            new NodeSetting({
                name: "Default",
                number: v => { this.default_value = v },
                update: () => { return { number: this.default_value }; }
            })
        ]));
    }

    to_json() {
        return Object.assign(
            super.to_json(),
            {
                default_value: this.default_value,
                reset_active: this.reset_active
            }
        );
    }
}

class ListNode extends SheetNode {
    static DEFAULT_BREAK_TITLE = "Break";
    static DEFAULT_ITEM_TEXT = "New item";
    static LIST_ITEM_HEIGHT = 29;

    constructor(options) {
        super(options);

        this._checkboxes_active = null;
        this.checkboxes_active = (options?.checkboxes_active !== undefined) ?
            options.checkboxes_active : true;

        this.set_up_controls();

        if (options?.content) {
            this.checkboxes_active = options.content.checkboxes_active;
            this.content_from_json(options.content.items);
        }
    }

    get checkboxes_active() {
        return this._checkboxes_active;
    }

    set checkboxes_active(bool) {
        this._checkboxes_active = bool;

        if (this._checkboxes_active) {
            this.content.classList.add("checkboxes_active");
        }
        else {
            this.content.classList.remove("checkboxes_active");
        }
    }

    set_up_content() {
        this.content.classList.add("list");
        this.content.contentEditable = false;
    }

    update_content_editable(editable) {
        this.content.querySelectorAll(
            ".list_item_content:not(.list_break)"
        ).forEach(i => {
            i.contentEditable = editable;
        });
    }

    set_up_controls() {
        let add_item = new Control(
            e => this.add_item(),
            {
                icon: "add.png",
                title: "Add item",
                toggle: true
            }
        );

        let menu = new ContextMenu(add_item);
        menu.add_entry(
            new ContextMenuEntry("add.png", "Add item", _ => this.add_item())
        );
        menu.add_entry(
            new ContextMenuEntry(
                "handle.png", "Add break", _ => this.add_item(true)
            )
        );

        this.header.controls.add_control(add_item);
    }

    set_up_settings() {
        super.set_up_settings();

        this.settings.add_setting(new MultiSetting([
            new NodeSetting({
                name: "Checkboxes",
                checkbox: v => { this.checkboxes_active = v },
                update: () => { return { checkbox: this.checkboxes_active }; }
            }),
            new NodeSetting({
                name: "Preset",
                dropdown: v => this.apply_preset(v),
                dropdown_entries: Object.keys(CONTENT["list_presets"]) 
            })
        ]));
    }

    // Creates a new list_item or list_break and adds it to the list's content.
    add_item(is_break = false, text = "", checked = true) {
        let new_item;
        if (is_break) {
            new_item = create_element("div", ["list_item", "list_break"]);
            new_item.appendChild(
                new Title({
                    title: text || ListNode.DEFAULT_ITEM_TEXT,
                    classes: ["list_item_content"]
                }).element
            );
            new_item.appendChild(new ListItemControlBox(new_item).element);
        }
        else {
            new_item = create_element("div", ["list_item"]);
            new_item.appendChild(new Checkbox(checked, [], false).element);
            new_item.appendChild(create_element(
                "span",
                ["list_item_content"],
                {
                    contentEditable: true,
                    spellcheck: false,
                    innerText: text || ListNode.DEFAULT_ITEM_TEXT
                }
            ));
            new_item.appendChild(new ListItemControlBox(new_item).element);
        }

        new_item.style.order = this.content.children.length;
        this.content.appendChild(new_item);
    }

    clear_items() {
        Array.from(this.content.children).forEach(item => item.remove());
    }

    apply_preset(preset_name) {
        this.clear_items();
        
        const preset = CONTENT["list_presets"][preset_name];
        
        this.checkboxes_active = preset["checkboxes"];
        this.header.controls.visible = preset["controls"];
        this.header.title.text = preset["title"];

        this.content_from_json(preset["entries"]);
    }

    content_from_json(list_items) {
        this.clear_items();
        list_items.forEach(item => {
            if (item.type === "break") {
                this.add_item(true, item.title);
            }
            else {
                this.add_item(false, item.content, item.checkbox_checked);
            }
        });
    }

    to_json() {
        let list_items = [];
        Array.from(this.content.children).sort(
            (a, b) => (a.style.order - b.style.order)
        ).forEach(i => {
            if (i.classList.contains("list_break")) {
                list_items.push({
                    type: "break",
                    title: i.querySelector(".title").innerText
                });
            }
            else {
                list_items.push({
                    type: "item",
                    content: i.querySelector(".list_item_content").innerText,
                    checkbox_checked: i.querySelector(".checkbox")
                        .classList.contains("checked")
                });
            }
        });

        return Object.assign(
            super.to_json(),
            {
                content: {
                    items: list_items,
                    checkboxes_active: this.checkboxes_active
                }
            }
        );
    }
}

class DieNode extends SheetNode {
    static DEFAULT_FONT_SIZE = "20pt";
    static DEFAULT_VALUE = 0;
    static DEFAULT_DIE_SIZE = 20;

    constructor(options) {
        super(options);

        this.modifiers = [];
        this.die_size = options?.die_size || DieNode.DEFAULT_DIE_SIZE;

        this.header.controls.add_control(new Control(
            e => this.roll(),
            {
                icon: "die.png",
                title: "Roll",
                toggle :false
            }
        ));
    }

    get value() {
        return parseInt(this.content.innerText);
    }

    set value(number) {
        this.content.innerText = number.toString();
    }

    set_up_content() {
        this.content.classList.add("die");
        this.content.contentEditable = false;
        this.content.fontSize = DieNode.DEFAULT_FONT_SIZE;
        this.value = DieNode.DEFAULT_VALUE;
    }

    set_up_settings() {
        super.set_up_settings();

        this.settings.add_setting(new NodeSetting({
            name: "Die size",
            number: v => { this.die_size = v },
            update: () => { return { number: this.die_size }; }
        }));
    }

    update_content_editable(editable) {
        return;
    }

    roll() {
        this.value = Math.ceil(Math.random() * this.die_size);
    }

    to_json() {
        return Object.assign(super.to_json(), { die_size: this.die_size });
    }
}

class ImageNode extends SheetNode {
    static DEFAULT_IMAGE = Icon.icon_path("cross.png");
    static CROPPING_MODES = ["contain", "cover", "fill"];

    constructor(options) {
        super(options);

        this.image = create_element("img");
        this.image.src = options?.content?.uri || ImageNode.DEFAULT_IMAGE;
        this.image.style.objectFit = "cover";
        this.content.appendChild(this.image);
        
        this.image_name = this.image.src;
    }

    get value() {
        return this.image.src;
    }

    set value(url) {
        this.image.src = url;
    }

    set_up_content() {
        this.content.classList.add("image_holder");
        this.content.contentEditable = false;
    }

    set_up_settings() {
        super.set_up_settings();

        let image_selection = new NodeSetting({
            name: "Image",
            string: v => { this.value = v; },
            update: () => { return { string: this.value }; } 
        });

        let input = image_selection.string;
        image_selection.string_func = src => {
            let img = create_element("img");

            img.onload = () => {
                this.value = src;
                input.setCustomValidity("");
            };

            img.onerror = () => {
                input.setCustomValidity("Image not found.");
            }

            img.src = src;
        };
        input.addEventListener("blur", () => {
            input.setCustomValidity("");
            input.value = this.value;
        });

        // TODO properly handle SVG files
        image_selection.element.appendChild(new UploadControl(
            f => {
                let file_reader = new FileReader();
                file_reader.onloadend = () => {
                    this.value = window.URL.createObjectURL(
                        new Blob([file_reader.result])
                    );

                    input.value = this.value;
                };

                file_reader.readAsArrayBuffer(f);
            },
            {
                accept: "image/*",
                title: "Upload image",
            }
        ).element);

        // TODO image name handling. Old logic here:
        // // ensure a unique image_name, so that it isn't overwritten in db
        // let image_names = document.getElementById("save_menu").image_names;
        // if (image_names.indexOf(file.name) >= 0) {
        //     name = file.name.replace(/\.\w+$/, "");
        //     ext = file.name.replace(/^\w+/, "");

        //     let i = 1;
        //     while (image_names.indexOf(`${name}${i}${ext}`) >= 0) {
        //         i += 1;
        //     }
        //     image.image_name = `${name}${i}${ext}`;
        // }
        // else {
        //     image.image_name = file.name;
        // }

        // image_src_input.value = image.image_name;

        this.settings.add_setting(image_selection);
        this.settings.add_setting(new NodeSetting({
            name: "Cropping",
            dropdown: v => { this.image.style.objectFit = v },
            dropdown_entries: ImageNode.CROPPING_MODES,
            update: () => { return { dropdown: this.image.style.objectFit }; }
        }))
    }

    update_content_editable(editable) {
        return;
    }

    content_json() {
        let is_local = this.image.src.startsWith("blob:null/"); 

        // TODO handle storing image in IDB

        return {
            uri: is_local ? this.image_name : this.image.src,
            blob: is_local,
            crop: this.image.style.objectFit
        };
    }
}

class CheckboxNode extends SheetNode {
    constructor(options) {
        super(options);

        this.checkbox = new Checkbox(true, ["background"]);
        this.content.appendChild(this.checkbox.element);

        this.value = (
            options?.content !== undefined
            ? options.content.checked
            : (
                options?.checked !== undefined
                ? options.checked
                : true
            )
        );
    }

    get value() {
        return this.checkbox.value;
    }

    set value(bool) {
        this.checkbox.value = bool;
    }

    set_up_content() {
        this.content.classList.add("checkbox_holder");
        this.content.contentEditable = false;
    }

    update_content_editable(editable) {
        return;
    }
}

class NodeGroup extends DraggableSheetElement {
    static OPACITY_WHILE_DRAGGING = "0.5";

    constructor(options, from_ghost = null) {
        super(["node_group", "rounded", "offset"], options);
    
        if (from_ghost) {
            this.x = options.x || from_ghost.x;
            this.y = options.y || from_ghost.y;
            this.w = options.width || options.w || from_ghost.w;
            this.h = options.height || options.h || from_ghost.h;
        }

        this.managed_nodes = [];

        this.menu = new ContextMenu(this);
        this.menu.add_entry(new DeleteContextMenuEntry(this));
        this.add_resize_context_menu_item();
    }

    start_drag(e) {
        this.gather_nodes();
        super.start_drag(e);
    }

    end_drag() {
        super.end_drag();
        this.managed_nodes.forEach(n => {
            n.node.x = this.x + n.dx;
            n.node.y = this.y + n.dy; 
            n.node.element.style.opacity = "";
        });
    }

    gather_nodes(lower_opacity = true) {
        if (this.sheet === null) {
            return;
        }

        this.sheet.nodes().forEach(node => {
            if (this.contains(node)) {
                this.managed_nodes.push({
                    node: node,
                    dx: node.x - this.x,
                    dy: node.y - this.y 
                });

                if (lower_opacity) {
                    node.element.style.opacity = NodeGroup.OPACITY_WHILE_DRAGGING;
                }
            }
        });
    }
}

class NodeGhost extends SheetElement {
    constructor(options) {
        super("div", ["node_ghost", "rounded", "offset"], options);
    }

    static from_node(node) {
        return new NodeGhost({
            sheet: node.sheet,
            width: node.width,
            height: node.height,
            x: node.x,
            y: node.y
        });
    }
}

class SizeablePreviewGhost extends NodeGhost {
    constructor(options) {
        super(options);

        this.move_func = e => this.move_ghost(e);
        this.leave_func = _ => this.hide();
        this.click_func = e => this.handle_click(e);

        this.finish_func = options.onfinish;
    }

    target_check(e) {
        if (e.target != this.sheet.element && e.target != this.element) {
            this.hide();
            return false;
        }
        else {
            this.show();
            return true;
        }
    }

    get_click_target(e) {
        return this.sheet.placement_click_to_grid_coord(
            e, -(this.w / 2), -(this.h / 2)
        );
    }

    move_ghost(e) {
        if (this.target_check(e)) {
            [this.x, this.y] = this.get_click_target(e);
        }
    }

    handle_click(e) {
        if (this.target_check(e)) {
            if (this.finish_func) {
                this.finish_func()
            }

            this.end_preview();
        }
    }

    _start_preview() {
        this.sheet.add_listener("mousemove", this.move_func);
        this.sheet.add_listener("mouseleave", this.leave_func);
        this.sheet.add_listener("click", this.click_func);
    }

    start_preview() {
        this._start_preview();
        return this; // Chaining convenience
    }

    _end_preview() {
        this.sheet.remove_listener("mousemove", this.move_func);
        this.sheet.remove_listener("mouseleave", this.leave_func);
        this.sheet.remove_listener("click", this.click_func);
        this.remove();
    }

    end_preview() {
        this._end_preview();
    }
}

class PinnablePreviewGhost extends SizeablePreviewGhost {
    constructor(options) {
        super(options);

        this.pin = null;
    }

    get_click_target(e) {
        return this.sheet.placement_click_to_grid_coord(
            e, this.w === 1 ? -0.5 : 0, this.h === 1 ? -0.5 : 0
        );
    }

    update_dimensions(x, y, l, t) {
        this.w = Math.max(Math.abs(x - l), 1);
        this.h = Math.max(Math.abs(y - t), 1);

        this.x = Math.min(x, l);
        this.y = Math.min(y, t);
    }

    handle_click(e) {
        if (!this.target_check(e)) {
            return;
        }

        if (this.pin === null) {
            this.pin = this.get_click_target(e);
        }
        else {
            let [x, y] = this.get_click_target(e);
            let [l, t] = this.pin;
            
            this.update_dimensions(x, y, l, t);
            
            if (this.finish_func) {
                this.finish_func(this.x, this.y, this.w, this.h);
            }

            this.end_preview();
        }
    }

    move_ghost(e) {
        if (!this.target_check(e)) {
            return;
        }

        let [x, y] = this.get_click_target(e);

        if (this.pin !== null) {
            let [l, t] = this.pin;
            this.update_dimensions(x, y, l, t);
        }
        else {
            this.x = x;
            this.y = y;    
        }
    }
}

class Sheet extends GridElement {
    static DOCUMENT_TITLE_PREFIX = "chsheet: ";

    constructor(save_title = "untitled") {
        super("div", ["sheet"], {
            width: 0,
            height: 0
        });

        this._save_title = null;
        this.save_title = save_title;

        this.element.style.display = "grid";

        this.resize_to_screen();
    
        this.elements = [];

        // elements that need their sheet reference updated when this sheet
        // is replaced with another
        this.replace_refs = [];
    }

    get save_title() {
        return this._save_title;
    }

    set save_title(new_title) {
        this._save_title = new_title;
        document.title = Sheet.DOCUMENT_TITLE_PREFIX + this._save_title;
    }

    nodes() {
        return this.elements.filter(e => e instanceof SheetNode);
    }

    groups() {
        return this.elements.filter(e => e instanceof NodeGroup);
    }

    add_element(sheet_element) {
        if (sheet_element.x + sheet_element.width > this.width) {
            this.width = sheet_element.x + sheet_element.width;
        }

        if (sheet_element.y + sheet_element.height > this.height) {
            this.height = sheet_element.y + sheet_element.height;
        }

        this.elements.push(sheet_element);
        this.element.appendChild(sheet_element.element);

        sheet_element.sheet = this;
        sheet_element.removed = false;
    }

    remove_element(sheet_element) {
        this.elements.filter(e => e !== sheet_element);
        this.element.removeChild(sheet_element.element);
    }

    replace_element(old_element, new_element) {
        this.remove_element(old_element);
        this.add_element(new_element);
    }

    resize() {
        this._resize();
        this.element.style.gridGap = GridElement.grid_gap + "px";

        let cell = GridElement.grid_size + "px "; 
        this.element.style.gridTemplateColumns =
            cell.repeat(this.width).slice(0, -1);
        this.element.style.gridTemplateRows =
            cell.repeat(this.height).slice(0, -1);
    }

    resize_to_screen() {
        this.width = Math.floor(
            window.innerWidth / (GridElement.grid_size + GridElement.grid_gap)
        ) - 1;
        this.height = Math.floor(
            window.innerHeight / (GridElement.grid_size + GridElement.grid_gap)
        ) - 1;
    }

    placement_click_to_grid_coord(e, delta_x = 0, delta_y = 0) {
        let rect = this.element.getBoundingClientRect();
        let offset_x = e.clientX - rect.left;
        let offset_y = e.clientY - rect.top;

        return GridElement.offset_to_grid_size(
            offset_x, offset_y, delta_x, delta_y
        );
    }

    add_mode(mode) {
        this.element.classList.add(mode);
    }

    remove_mode(mode) {
        this.element.classList.remove(mode);
    }

    replace(new_sheet) {
        this.element.parentNode.replaceChild(new_sheet.element, this.element);
        this.replace_refs.forEach(obj => {
            obj.sheet = new_sheet;
        });
        new_sheet.replace_refs = this.replace_refs;
    }

    to_json() {
        let json =  {
            title: this.save_title,
            time: new Date().getTime(),
            data: {
                nodes: this.nodes().map(node => node.to_json()),
                groups: this.groups().map(group => group.to_json())    
            }
        };
        return json;
    }

    static from_json(save) {
        let new_sheet = new Sheet(save.title);

        if (save.data.nodes) {
            save.data.nodes.forEach(node_data => {
                new_sheet.add_element(SheetNode.from_json(node_data));
            });    
        }
    
        if (save.data.groups) {
            save.data.groups.forEach(group_data => {
                new_sheet.add_element(new NodeGroup(group_data));
            });
        }
    
        return new_sheet;
    }
}

class Tool extends ElementWrapper {
    static HEIGHT = 60;
    
    constructor(options) {
        super("button", ["tool"]);
        this.image = this.element.appendChild(
            create_element(
                "img",
                [],
                {
                    draggable: false,
                    src: Icon.icon_path(
                        options.icon_name
                        || options.icon
                        || "cross.png"
                    ),
                    title: options.title
                }
            )
        );
        this.element.onclick = options.onclick;
    }
}

class ModeTool extends Tool {
    // Tools which enter a behavioural mode like "Add node"
    static END_MODE_IMAGE = "tick.png";
    static mode_tools = [];

    constructor(sheet, icon_name, title, super_mode = null) {
        super({
            icon_name: icon_name,
            title: title,
            onclick: e => this.handle_click(e)
        });

        this.sheet = sheet;
        this.sheet.replace_refs.push(this);

        this.default_image = this.image.src;
        this.in_mode = false;
        this.super_mode = super_mode;

        ModeTool.mode_tools.push(this);
    }

    handle_click(e) {
        if (this.in_mode) {
            this.end();
        }
        else {
            this.start();
        }
    }

    _start() {
        // Implemented by subclasses.
    }

    start() {
        // Only one ModeTool can be active at a time. 
        ModeTool.mode_tools.forEach(t => {
            if (this.super_mode === null || !(t instanceof this.super_mode)) {
                t.end();
            }
        });

        this.in_mode = true;
        this.image.src = Icon.icon_path(ModeTool.END_MODE_IMAGE);
        this._start();
    }

    _end() {
        // Implemented by subclasses.
    }

    end() {
        // End all submodes
        ModeTool.mode_tools.forEach(t => {
            if (t.super_mode && (this instanceof t.super_mode)) {
                t.end();
            }
        });

        this.in_mode = false;
        this.image.src = this.default_image;
        this._end();
    }
}

class AddNodeTool extends ModeTool {
    constructor(sheet) {
        super(sheet, "add.png", "Add node");

        this.preview_ghost = null;

        this.node_settings = null;
        this._node = null;
        this.node = new SheetNode({
            replace_func: (_, new_node) => { this.node = new_node; }
        });

        this.add_listener("contextmenu", e => {
            e.preventDefault();
            if (this.node_settings) {
                this.node_settings.show();
            }
        });
    }
    
    set node(new_node) {
        this._node = new_node;
        this._node.dimension_handler = () => {
            if (this.preview_ghost) {
                this.preview_ghost.w = this.node.w;
                this.preview_ghost.h = this.node.h;
            }
        };

        if (this.node_settings) {
            this.element.removeChild(this.node_settings.element);
        }
        this.node_settings = this.node.settings;
        this.element.appendChild(this.node_settings.element);
        this.node_settings.element.classList.add("left");
    }

    get node() {
        return this._node;
    }

    create_preview_ghost() {
        this.preview_ghost = new SizeablePreviewGhost({
            sheet: this.sheet,
            width: this.node.w,
            height: this.node.h,
            onfinish: () => {
                this.node.x = this.preview_ghost.x;
                this.node.y = this.preview_ghost.y;
                this.sheet.add_element(this.node.clone());
                this.create_preview_ghost();
            }
        }).start_preview();
    }

    _start() {
        this.create_preview_ghost();
    }

    _end() {
        if (this.preview_ghost) {
            this.preview_ghost.end_preview();
        }
    }
}

class GroupingTool extends ModeTool {
    constructor(sheet, toolbar) {
        super(sheet, "clone.png", "Group nodes");
        this.toolbar = toolbar;
    }

    _start() {
        this.sheet.add_mode("grouping");
        this.toolbar.show();
    }

    _end() {
        this.sheet.remove_mode("grouping");
        this.sheet.groups().forEach(group => {
            group.end_resize();
        });
        this.toolbar.hide();
    }
}

class CreateGroupTool extends ModeTool {
    constructor(sheet) {
        super(sheet, "add.png", "Create group", GroupingTool);

        this.preview_ghost = null;
    }

    _start() {
        this.preview_ghost = new PinnablePreviewGhost({
            sheet: this.sheet,
            width: 1,
            height: 1,
            onfinish: () => {
                this.sheet.add_element(
                    new NodeGroup({sheet: this.sheet}, this.preview_ghost)
                );
                this._start();
            }
        }).start_preview();
    }

    _end() {
        if (this.preview_ghost) {
            this.preview_ghost.end_preview();
        }
    }
}

class Toolbar extends ElementWrapper {
    static TRANSITION_TIME = 500;
    static CLOSED_HEIGHT = 40;
    static END_LIP_HEIGHT = 5;

    constructor(hidden = false, classes = []) {
        super("div", ["toolbar"].concat(classes));

        this._order = null;
        this.order = 0;

        this.tools = [];

        this.tools_element = create_element("div", ["tools", "hidden"]);
        this.element.appendChild(this.tools_element);

        this.element.style.height = Toolbar.CLOSED_HEIGHT + "px";
        this.element.style.transition = "all " + Toolbar.TRANSITION_TIME + "ms";

        this._telescoped = false;

        this.toggle_element = create_element("div", ["toolbar_toggle"]);
        this.toggle_element.appendChild(
            create_element("img", [], {src: Icon.icon_path("chevron_down.png")})
        );
        this.toggle_element.onclick = () => this.toggle_telescoped();
        this.element.appendChild(this.toggle_element);

        if (hidden) {
            this.hide();
        }
    }

    get order() {
        return this._order;
    }

    set order(new_order) {
        this._order = new_order; 
        this.element.style.order = this._order;
    }

    get telescoped() {
        return this._telescoped;
    }

    set telescoped(bool) {
        this._telescoped = bool;

        if (this._telescoped) {
            this.show_tools();
            this.element.classList.add("telescoped");
            this.element.style.height = (
                Tool.HEIGHT * this.tools_element.childElementCount
                + Toolbar.CLOSED_HEIGHT + Toolbar.END_LIP_HEIGHT
            ) + "px";
        }
        else {
            this.element.classList.remove("telescoped");
            this.element.style.height = Toolbar.CLOSED_HEIGHT + "px";
        }
    }

    hide(transition = true) {
        if (transition) {
            this.toggle_telescoped(false);
            this.element.style.top = "-" + Toolbar.CLOSED_HEIGHT + "px";
        }
        else {
            no_transition(this.element, () => this.hide());
        }
    }

    show(transition = true) {
        if (transition) {
            this.toggle_telescoped(true);
            this.element.style.top = "0px";
        }
        else {
            no_transition(this.element, () => this.show(true));
        }
    }

    toggle_telescoped(to = null) {
        if (to !== null) {
            this.telescoped = to;
        }
        else {
            this.telescoped = !this.telescoped;
        }
    }

    add_tool(tool) {
        this.tools.push(tool);
        this.tools_element.appendChild(tool.element);
    }

    show_tools() {
        this.tools_element.classList.remove("hidden");
    }
}

class Toolbox extends ElementWrapper {
    constructor(toolbars = null) {
        super("div", ["toolbox"]);

        this.toolbars = [];

        if (toolbars) {
            toolbars.forEach(t => this.add_toolbar(t));
        }
    }

    add_toolbar(toolbar) {
        this.toolbars.push(toolbar);
        this.element.appendChild(toolbar.element);
        toolbar.order = this.toolbars.length;
    }
}

class PanelMenu extends VisibilityManagedWrapper {
    static menus = [];
    
    constructor() {
        super("div", ["panel"]);
        this.hide();
        document.body.appendChild(this.element);
        PanelMenu.menus.push(this);

        this.header = create_element(
            "div",
            ["panel_header", "background", "padded"]
        );
        this.element.appendChild(this.header);

        this.controls = new ControlBox({ classes: ["spaced"] });
        this.controls.add_control(new Control(
            () => this.hide(),
            {
                background: false,
                icon: "cross.png",
                title: "Close"
            }
        ));
        this.header.appendChild(this.controls.element);
    }

    static get fade() {
        return document.getElementById("fade");
    }

    static fade_in() {
        PanelMenu.fade.classList.add("active");
    }

    static fade_out() {
        PanelMenu.fade.classList.remove("active");
    }

    _show() {
        PanelMenu.menus.forEach(menu => {
            menu.hide();
        });

        PanelMenu.fade_in();
        this.visible = true;
    }

    _hide() {
        PanelMenu.fade_out();
        this.visible = false;
    }
}

class SaveListItem extends ElementWrapper {
    constructor(owner, save) {
        super("div", ["list_item"]);

        // Old saves didn't have ids
        if (!save.id) {
            save.id = save.title;
        }

        this.owner = owner;

        this.checkbox = new Checkbox(false, [], false);
        this.element.appendChild(this.checkbox.element);

        this.title_label = create_element(
            "span",
            ["item_title", "label"],
            {
                title: "Load save",
                innerHTML: save.title
            }
        );
        this.title_label.onclick = () => {
            load_sheet(
                save.id,
                save => this.owner.set_active_save(save)
            );
        };

        this.element.appendChild(this.title_label);
        this.element.appendChild(
            create_element(
                "span",
                ["label"],
                {
                    innerText: new Date(save.time)
                        .toLocaleDateString("en-AU")
                }
            )
        );
        this.element.appendChild(
            create_element(
                "span",
                ["label"],
                {
                    innerText: get_nodes(save).length.toString() + " nodes"
                }
            )
        );

        let controls = new ControlBox({ classes: ["spaced"] });
        controls.add_control(
            new Control(
                // TODO this assuems that sheets have an id, not just a title
                () => {
                    delete_sheet(save.id);
                    this.owner.remove_save(this);
                },
                {
                    background: false,
                    icon: "trash.png",
                    title: "Delete"
                }
            )
        );
        controls.add_control(
            new Control(
                () => download_sheet(save.id),
                {
                    background: false,
                    icon: "down.png",
                    title: "Download"
                }
            )
        );
        this.element.appendChild(controls.element);

        this._save_title = null;
        this.save_title = save.title;
    }

    get selected() {
        return this.checkbox.value;
    }

    set selected(bool) {
        this.checkbox.value = bool;
    }

    get save_title() {
        return this._save_title;
    }

    set save_title(new_title) {
        this._save_title = new_title;
        this.title_label.innerText = this._save_title;
    }
}

class SaveMenu extends PanelMenu {
    constructor(sheet) {
        super();

        this.sheet = sheet;
        this.sheet.replace_refs.push(this);

        // TODO better way of handling images
        this.image_names = [];

        this.save_list_loaded = false;

        this.saves = [];

        this.callback = () => this.reload_saves();

        this.set_up();

        this.save_title = this.sheet.save_title;
    }

    get save_title() {
        return this.header_input.value;
    }

    set save_title(new_title) {
        this.header_input.value = new_title;
    }

    get selected() {
        return this.saves.filter(i => i.selected());
    }

    show() {
        super.show();

        if (!this.save_list_loaded) {
            this.reload_saves();
            this.save_list_loaded = true;
        }
    }

    set_active_save(save) {
        let sheet = Sheet.from_json(save);
        this.sheet.replace(sheet);
        this.save_title = save.title;
    }

    validate_title() {
        if (this.save_title === "") {
            this.header_input.setCustomValidity("Title required to save.");
            this.header_input.keyup = () => this.validate_title();
            return false;
        }
        else {
            this.header_input.setCustomValidity("");
            this.header_input.keyup = null;
            return true;
        }
    }

    set_up_controls() {
        this.controls.add_control(new Control(
            () => {
                if (this.validate_title()) {
                    save_sheet(this.sheet, this.callback);
                    this.sheet.save_title = this.save_title;
                }
            },
            { background: false, icon: "save.png", title: "Save" }
        ));
        this.controls.add_control(new Control(
            () => {
                // TODO load example properly
                fetch("/example.json").then(resp => resp.json()).then(
                    data => this.set_active_save({
                        title: "example",
                        data: data,
                        time: new Date().getTime()
                    })
                );
            },
            {
                background: false,
                icon: "clone.png",
                title: "Load Example"
            }
        ));

        // TODO displays wrong cursor on hover, input is slightly
        // misaligned
        this.controls.add_control(new UploadControl(
            f => upload_sheet(f, this.callback),
            {
                accept: ".json",
                background: false,
                classes: ["input_holder"],
                icon: "up.png",
                title: "Upload save"
            }
        ));

        this.controls.add_control(new Control(
            () => {
                let saves_to_delete = this.selected();
                if (saves_to_delete.length) {
                    delete_sheets(saves_to_delete, this.callback);
                    this.header_checkbox.value = false;
                }
            },
            {
                background: false,
                icon: "trash.png",
                title: "Delete selected"
            }
        ));

        this.controls.reverse_order();
    }

    set_up_header() {
        this.set_up_controls();

        this.header_checkbox = new Checkbox(false, [], false);
        this.header_checkbox.oninput = v => this.set_all_checkboxes(v);
        this.header.appendChild(this.header_checkbox.element);

        this.header_input = create_element(
            "input", [], { minLength: 1,maxLength: 32 }
        );
        this.header.appendChild(this.header_input);
    }

    set_up_body() {
        this.save_list = create_element("div", ["entry_list"]);
        this.element.appendChild(this.save_list);

        this.save_list.appendChild(
            create_element(
                "span",
                ["label"],
                { innerText: "No saves" }
            )
        );
    }

    set_up() {
        this.set_up_header();
        this.set_up_body();
    }

    set_all_checkboxes(bool = true) {
        this.saves.forEach(i => {
            i.selected = bool
        });
    }

    remove_all_saves() {
        this.saves.forEach(i => i.remove());
        this.saves = [];
    }

    remove_save(save) {
        this.saves = this.saves.filter(i => {
            if (i === save) {
                i.remove();
                return false;
            }
            return true;
        });
    }

    add_save(save) {
        this.saves.push(save);
        this.save_list.appendChild(save.element);
    }

    reload_saves() {
        get_all_sheets(data => {
            this.remove_all_saves();
            this.image_names = update_image_store(data);
            data.sort((a, b) => b.time - a.time);
            data.forEach(save => {
                this.add_save(new SaveListItem(this, save));  
            });
        });
    }
}

class SettingsMenu extends PanelMenu {
    constructor() {
        super();

        this.set_up();
    }

    set_up() {
        this.header.appendChild(
            create_element("span", ["title"], { innerText: "Settings" })
        );

        let settings = create_element("div", ["entry_list"]);
        this.element.appendChild(settings);

        let node_size = create_element("div", ["list_item"]);
        settings.appendChild(node_size);
        node_size.appendChild(
            create_element("span", ["label"], { innerText: "Node size" })
        );
        node_size.appendChild(
            create_element(
                "input",
                ["secondary"],
                {
                    max: GridElement.GRID_SIZE_MAX,
                    min: GridElement.GRID_SIZE_MIN,
                    oninput: e => GridElement.set_grid_size(e.target.value), 
                    type: "number",
                    value: GridElement.grid_size
                }
            )
        );
        node_size.appendChild(
            create_element("span", ["label"], { innerText: "Gap" })
        );
        node_size.appendChild(
            create_element(
                "input",
                ["secondary"],
                {
                    max: GridElement.GRID_GAP_MAX,
                    min: GridElement.GRID_GAP_MIN,
                    oninput: e => GridElement.set_grid_gap(e.target.value),
                    type: "number",
                    value: GridElement.grid_gap
                }
            )
        );
    }
}

class LoginMenu extends PanelMenu {
    // These should be the same as in auth.js lest they simply cause confusion
    static USERNAME_MIN_LENGTH = 2;
    static USERNAME_MAX_LENGTH = 16;
    static USERNAME_VALIDATION_REGEX = new RegExp( 
        "^[a-z0-9_-]{"
        + LoginMenu.USERNAME_MIN_LENGTH.toString()
        + ","
        + LoginMenu.USERNAME_MAX_LENGTH.toString()
        + "}$",
        "i"
    );
    static PASSWORD_MIN_LENGTH = 8;
    static PASSWORD_MAX_LENGTH = 256;
    static RECOVERY_KEY_LENGTH = 32;
    static RECOVERY_KEY_REGEX = new RegExp(
        "^[a-z0-9]{" + LoginMenu.RECOVERY_KEY_LENGTH.toString() + "}$", "i"
    );
    
    constructor(session) {
        super();

        this.session = session;

        this.inputs = {}; // User input fields
        this.entries = {}; // List UI entries
        this.fields = {}; // Text fields to edit

        // Used for form construction convenience methods
        this.latest_entry = null;

        // Reuse register password inputs.
        // true => register / false => reset_password  
        this.register_mode = true;

        this.set_up();
        this.update_fields();
    }

    set_up() {
        this.header.appendChild(
            create_element("span", ["title"], { innerText: "Account" })
        );

        let info = this.element.appendChild(
            create_element("div", ["background", "login_body"])
        );
        info.appendChild(
            create_element("img", [], { src: Icon.icon_path("clone.png") })
        );
        
        this.body = this.element.appendChild(
            create_element("div", ["entry_list"])
        );
        

        this.entry("not_logged_in", true);
        this.label("not_logged_in_label", "Not logged in");
        this.label("not_logged_in_reason", "", true);

        this.entry("logged_in_as", true);
        this.label(null, "Logged in as:");
        this.label("logged_in_as_username");
        this.control(() => this.logout(), "left.png", "Log out");

        let login_username;
        let login_password;
        let login = this.entry("login");
        this.control(
            () => {
                this.update_fields("choose"),
                login_username.value = login_password.value = "";
            },
            "cross.png",
            "Cancel"
        );
        this.label(null, "Username");
        login_username = login.appendChild(create_element(
            "input",
            ["secondary"],
            {
                type: "text",
                minLength: LoginMenu.USERNAME_MIN_LENGTH,
                maxLength: LoginMenu.USERNAME_MAX_LENGTH,
            }
        ));
        this.label(null, "Password");
        login_password = login.appendChild(create_element(
            "input",
            ["secondary"],
            {
                type: "password",
                minLength: LoginMenu.PASSWORD_MIN_LENGTH,
                maxLength: LoginMenu.PASSWORD_MAX_LENGTH,
            }
        ));
        this.control(() => this.login_user(), "right.png", "Submit");
        this.inputs.login_username = login_username;
        this.inputs.login_password = login_password;

        this.entry("forgot_password");
        this.label(null, "Forgot password");
        this.control(
            () => this.update_fields("reset"), "right.png", "Reset password"
        );

        let register_username;
        let register_password;
        let register_confirm;
        let register_a = this.entry("register_a");
        this.control(
            () => {
                this.update_fields("choose"),
                register_username.value = (
                    register_password.value = register_confirm.value = ""
                );
                this.inputs.recovery_key.value = "";
            },
            "cross.png",
            "Cancel"
        );
        this.label(null, "Username");
        register_username = register_a.appendChild(create_element(
            "input",
            ["secondary"],
            {
                type: "text",
                minLength: LoginMenu.USERNAME_MIN_LENGTH,
                maxLength: LoginMenu.USERNAME_MAX_LENGTH,
                oninput: e => this.validate_username(e.target)
            }
        ));

        let recovery_key;
        let reset = this.entry("reset");
        this.label(null, "Recovery key:");
        recovery_key = reset.appendChild(
            create_element(
                "input",
                ["secondary"],
                {
                    type: "text",
                    minLength: LoginMenu.RECOVERY_KEY_LENGTH,
                    maxLength: LoginMenu.RECOVERY_KEY_LENGTH,
                    oninput: e => this.validate_recovery_key(e.target)
                }
            )
        );
        this.inputs.recovery_key = recovery_key;

        let register_b = this.entry("register_b");
        this.label(null, "Password");
        register_password = register_b.appendChild(create_element(
            "input",
            ["secondary"],
            {
                type: "password",
                minLength: LoginMenu.PASSWORD_MIN_LENGTH,
                maxLength: LoginMenu.PASSWORD_MAX_LENGTH,
                oninput: e => this.validate_password(e.target)
            }
        ));
        this.label(null, "Confirm");
        register_confirm = register_b.appendChild(create_element(
            "input",
            ["secondary"],
            {
                type: "password",
                minLength: LoginMenu.PASSWORD_MIN_LENGTH,
                maxLength: LoginMenu.PASSWORD_MAX_LENGTH,
                oninput: e => this.validate_confirm(e.target)
            }
        ));
        this.control(
            () => {
                if (this.register_mode) {
                    this.register_user();
                }
                else {
                    this.reset_password();
                }
            },
            "right.png",
            "Submit"
        );
        this.inputs.register_username = register_username;
        this.inputs.register_password = register_password;
        this.inputs.register_confirm = register_confirm;

        this.entry("register_recovery");
        this.label(null, "Recovery key:");
        this.label("register_recovery_key");

        this.entry("register_recovery_message");
        this.label(
            null,
            "Save this somewhere, you'll need it to reset your password."
        );        
        
        this.entry("choose");
        this.label(null, "Log in");
        this.control(() => this.update_fields("login"), "right.png", "Log in");
        this.label(null, "Register");
        this.control(
            () => this.update_fields("register"), "right.png", "Register"
        );
    }

    entry(title, topmost = false) {
        this.latest_entry = this.entries[title] = this.body.appendChild(
            create_element(
                "div",
                ["list_item", "centering", "hidden"],
                null,
                topmost ? { marginTop: "0" } : null
            )
        );
        return this.latest_entry;
    }

    label(title = null, innerText = "", hidden = false) {
        let label = this.latest_entry.appendChild(create_element(
            "span", ["label"], { innerText: innerText }
        ));

        if (hidden) {
            label.classList.add("hidden");
        }

        if (title) {
            this.fields[title] = label;
        }

        return label;
    }

    control(func, icon, title) {
        return this.latest_entry.appendChild(
            new Control(
                func,
                {
                    background: false,
                    icon: icon,
                    classes: ["foreground"],
                    title: title
                }
            ).element
        );
    }

    validate_username(input, allow_empty = true) {
        let username = input.value;
        if (allow_empty && username === "") {
            input.classList.remove("invalid");
            return true;
        }
        
        if (username.length < LoginMenu.USERNAME_MIN_LENGTH) {
            input.setCustomValidity("Username too short");
        }
        else if (username.length > LoginMenu.USERNAME_MAX_LENGTH) {
            input.setCustomValidity("Username too long");
        }
        else if (
            !LoginMenu.USERNAME_VALIDATION_REGEX.test(username)
        ) {
            input.setCustomValidity(
                "Usernames may only contain letters, numbers, "
                + "underscores and hyphens"
            );
        }
        else {
            input.classList.remove("invalid");
            return true;
        }

        input.classList.add("invalid");
        return false;
    }

    validate_password(input, allow_empty = true) {
        let password = input.value;
        
        if (allow_empty && password === "") {
            input.classList.remove("invalid");
            return true;
        }

        if (password.length < LoginMenu.PASSWORD_MIN_LENGTH) {
            input.setCustomValidity("Password too short");
        }
        else if (password.length > LoginMenu.PASSWORD_MAX_LENGTH) {
            input.setCustomValidity("Password too long");
        }
        else {
            input.classList.remove("invalid");
            return true;
        }

        input.classList.add("invalid");
        return false;
    }

    validate_confirm(input, allow_empty = true) {
        if (
            (allow_empty && input.value === "")
            || input.value === this.inputs.register_password.value
        ) {
            input.classList.remove("invalid");
            return true;
        }
        else {
            input.setCustomValidity("Passwords don't match");
            input.classList.add("invalid");
            return false;
        }
    }

    validate_recovery_key(input, allow_empty = true) {
        let recovery_key = input.value;
        if (
            allow_empty && recovery_key === ""
            || LoginMenu.RECOVERY_KEY_REGEX.test(recovery_key)
        ) {
            input.classList.remove("invalid");
            return true;
        }
        else {
            input.setCustomValidity(
                "Your recovery key is 32 alphanumeric characters."
            );
            input.classList.add("invalid");
            return false;
        }
    }

    hide_item(item) {
        item.classList.add("hidden");
    }

    show_item(item) {
        item.classList.remove("hidden");
    } 

    hide_items(...items) {
        items.forEach(item => this.hide_item(item));
    }

    hide_all() {
        this.hide_items(...Object.values(this.entries));
    }

    clear_inputs() {
        Object.values(this.inputs).forEach(input => {
            input.value = "";
        });
    }

    update_fields(mode, reason) {
        this.hide_all();
        this.fields.not_logged_in_label.innerText = "Not logged in";

        if (this.session.username && this.session.session_key) {
            this.clear_inputs();
            this.fields.logged_in_as_username.innerText = this.session.username;
            this.show_item(this.entries.logged_in_as);

            if (this.session.recovery_key) {
                this.fields.register_recovery_key.innerText = (
                    this.session.recovery_key
                );
                this.show_item(this.entries.register_recovery);
                this.show_item(this.entries.register_recovery_message);
            }
        }
        else if (mode === "choose") {
            this.show_item(this.entries.not_logged_in);
            this.show_item(this.entries.choose);
        }
        else if (mode === "login") {
            if (reason) {
                this.fields.not_logged_in_label.innerText = "Failed to log in:";
                this.fields.not_logged_in_reason.innerText = reason;
                this.show_item(this.fields.not_logged_in_reason);    
            }
            else {
                this.fields.not_logged_in_label.innerText = "Log in";
            }
            this.show_item(this.entries.not_logged_in);
            this.show_item(this.entries.login);
            this.show_item(this.entries.forgot_password);
        }
        else if (mode === "register") {
            this.register_mode = true;
            if (reason) {
                this.fields.not_logged_in_label.innerText = (
                    "Registration failed:"
                );
                this.fields.not_logged_in_reason.innerText = reason;
                this.show_item(this.entries.not_logged_in_reason);
            }
            else {
                this.fields.not_logged_in_label.innerText = "Register";
            }
            this.show_item(this.entries.not_logged_in);    
            this.show_item(this.entries.register_a);
            this.show_item(this.entries.register_b);
        }
        else if (mode === "reset") {
            this.register_mode = false;
            if (reason) {
                this.fields.not_logged_in_label.innerText = (
                    "Password reset failed:"
                );
                this.fields.not_logged_in_reason.innerText = reason;
                this.show_item(this.fields.not_logged_in_reason);
            }
            else {
                this.fields.not_logged_in_label.innerText = "Reset password";
            }
            this.show_item(this.entries.not_logged_in);

            // Note: I reuse the register inputs rather than creating a new set.
            this.show_item(this.entries.register_a);
            this.show_item(this.entries.register_b);
            this.show_item(this.entries.reset);
        }
        else if (mode === "logout") {
            this.clear_inputs();
            this.fields.not_logged_in_label.innerText = "Logged out";
            this.show_item(this.entries.not_logged_in);
            this.show_item(this.entries.choose);
        }
        else {
            this.clear_inputs();
            this.show_item(this.entries.not_logged_in);
            this.show_item(this.entries.choose);
        }
    }

    logout() {
        this.session.logout(res => this.update_fields("logout"));
    }

    login_user() {
        if (
            this.validate_username(this.inputs.login_username)
            && this.validate_password(this.inputs.login_password)
        ) {

            this.session.login(
                this.inputs.login_username.value,
                this.inputs.login_password.value,
                res => this.update_fields("login", res.reason)
            );
        }
    }

    register_user() {
        if (
            this.validate_username(this.inputs.register_username)
            && this.validate_password(this.inputs.register_password)
            && this.validate_confirm(this.inputs.register_confirm)
        ) {

            this.session.register(
                this.inputs.register_username.value,
                this.inputs.register_password.value,
                res => this.update_fields("register", res.reason)
            );
        }
    }

    reset_password() {
        if (
            this.validate_username(this.inputs.register_username)
            && this.validate_password(this.inputs.register_password)
            && this.validate_confirm(this.inputs.register_confirm)
            && this.validate_recovery_key(this.inputs.recovery_key)
        ) {
            this.session.reset_password(
                this.inputs.register_username.value,
                this.inputs.register_password.value,
                this.inputs.recovery_key.value,
                res => this.update_fields("reset", res.reason)
            );
        }
    }
}

class Session {
    static RECOVERY_KEY_MAX_AGE = 24 * 60 * 60 * 1000; // 1 day

    constructor() {
        this.username = null;
        this.session_key = null;

        // If we have stored the recovery key for the maximum time, delete it.
        this._recovery_key = null;
        if (
            parseInt(localStorage.getItem("recovery_key_expiry"))
            + Session.RECOVERY_KEY_MAX_AGE
            > new Date().getTime()
        ) {
            this.recovery_key = null;
        }
        else {
            this._recovery_key = localStorage.getItem("recovery_key") || null;
        }


        this.check_cookies();
    }

    get recovery_key() {
        return this._recovery_key;
    }

    set recovery_key(key) {
        this._recovery_key = key;

        if (key) {
            localStorage.setItem("recovery_key", key);
            localStorage.setItem(
                "recovery_key_received",
                new Date().getTime().toString()
            );
        }
        else {
            localStorage.removeItem("recovery_key");
            localStorage.removeItem("recovery_key_expiry");
        }
    }

    login(username, password, callback) {
        post(
            "/login",
            {
                username: username,
                password: password
            },
            res => {
                this.check_cookies();
                callback(res);
            }
        );
    }

    logout(callback) {
        post(
            "/logout",
            {},
            res => {
                document.cookie = "";
                this.recovery_key = null;
                this.check_cookies();
                callback(res);
            }
        );
    }

    register(username, password, callback) {
        post(
            "/register",
            {
                username: username,
                password: password,
                email: null
            },
            res => {
                this.check_cookies();
                if (res.recovery_key) {
                    this.recovery_key = res.recovery_key;
                }

                callback(res);
            }
        );
    }

    reset_password(username, password, recovery_key, callback) {
        post(
            "/reset",
            {
                username: username,
                new_password: password,
                recovery_key: recovery_key,
            },
            res => {
                this.check_cookies();
                if (res.recovery_key) {
                    this.recovery_key = res.recovery_key;
                }

                callback(res);
            }
        );
    }

    check_cookies() {
        const cookies = this.parse_cookies();
        this.username = cookies.username || null;
        this.session_key = cookies.session_key || null;
    }

    parse_cookies() {
        let ret = {};
        document.cookie.split("; ").forEach(cookie => {
            let [key, value] = cookie.split("=");
            ret[key] = value;
        });

        return ret;
    }
}

function set_up_workspace(sheet) {
    let session = new Session();

    let save_menu = new SaveMenu(sheet);
    let settings_menu = new SettingsMenu();
    let login_menu = new LoginMenu(session);

    let group = new Toolbar(true, ["grouping"]);
    group.add_tool(new CreateGroupTool(sheet));

    let main = new Toolbar();
    main.add_tool(new AddNodeTool(sheet));
    main.add_tool(new GroupingTool(sheet, group));
    main.add_tool(new Tool({
        icon: "save.png",
        title: "Save",
        onclick: () => save_menu.show()
    }));
    main.add_tool(new Tool({
        icon: "cog.png",
        title: "Settings",
        onclick: () => settings_menu.show()
    }));
    main.add_tool(new Tool({
        icon: "person.png",
        title: "Login",
        onclick: () => login_menu.show()
    }));

    let toolbox = new Toolbox([main, group]);
    let toolbox_node = document.getElementById("toolbox"); 
    toolbox_node.parentNode.replaceChild(toolbox.element, toolbox_node);

    document.onkeydown = function (e) {
        // https://stackoverflow.com/a/19589671
        if (
            e.key == "Backspace"
            && !(
                e.target.tagName == "INPUT"
                || e.target.contentEditable == "true"
            )
        ) {
            e.preventDefault();
        }
        else if (e.key == "s" && e.ctrlKey) {
            e.preventDefault();
            save_menu.show();
        }
    };
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

function create_element(tagname, classes, attributes, styles) {
    let el = document.createElement(tagname);

    if (classes) {
        classes.forEach(c => {
            el.classList.add(c);
        });
    }

    if (attributes) {
        for ([k, v] of Object.entries(attributes)) {
            el[k] = v;
        }
    }

    if (styles) {
        for ([k, v] of Object.entries(styles)) {
            el.style[k] = v;
        }
    }

    return el;
}

function post(endpoint, body, callback) {
    let req = new XMLHttpRequest();
    req.responseType = "json";
    req.onerror = () => alert("Network error. Please try again later.");
    req.onload = () => {
        callback(req.response);
    };
    req.open("POST", endpoint);
    req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    req.send(JSON.stringify(body));
}
