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
    constructor(tagname, classes, options) {
        super(tagname, classes);

        this._width = options?.width || 2;
        this._height = options?.height || 2;

        GridElement.grid_elements.push(this);
    }

    static grid_size = INITIAL_GRID_SIZE;
    static grid_gap = INITIAL_GRID_GAP;

    // A list of all existing grid_elements is stored such that they can be
    // each be resized to update the grid dimensions.
    static grid_elements = [];

    static set_grid_size(val) {
        GridElement.grid_size = val;
        GridElement.grid_elements.forEach(e => e.resize());
    }

    static set_grid_gap(val) {
        GridElement.grid_gap = val;
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

    static offset_to_grid_size(off_x, off_y, delta_x = 0, delta_y = 0) {
        return [
            Math.round(
                off_x / (GridElement.grid_size + GridElement.grid_gap) + delta_x
            ),
            Math.round(
                off_y / (GridElement.grid_size + GridElement.grid_gap) + delta_y
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
}

class SheetElement extends VisibilityManagedWrapper {
    constructor(tagname, classes, options) {
        super(tagname, classes, options);

        this._x = options?.x || 0;
        this._y = options?.y || 0;
        this._w = options?.width || options?.w || 1;
        this._h = options?.height || options?.h || 1;

        this.update_grid_area();
    
        if (options?.sheet) {
            this.add_to_sheet(options.sheet);
        }

        this.removed = false;
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
}

class Title extends VisibilityManagedWrapper {
    constructor(options) {
        super("span", ["title"]);
        
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

        this.element.src = Icon.icon_path(name); 
        
        if (background) {
            this.element.classList.add("background");
        }
    }

    static icon_path(name) {
        return "icons/" + name;
    }
}

class Checkbox extends ElementWrapper {
    constructor(checked = true, classes = [], background = true) {
        super("div", ["checkbox"].concat(classes));

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

class Control extends ElementWrapper {
    constructor(func, options) {
        super("div", ["control"]);
        
        if (options?.toggle) {
            this.element.classList.add("toggle");
        }

        this.icon = new Icon(options.icon || options.icon_name);
        this.element.appendChild(this.icon.element);

        if (options?.title) {
            this.element.title = options.title;
        }
    
        this.func = func;
        this.element.onclick = e => this.func(e);
    }
}

class ControlBox extends VisibilityManagedWrapper {
    constructor(options) {
        super("div", ["control_box"]);
        this.visible = options?.controls_active || true;
        this.controls = [];
    }

    add_control(control) {
        this.controls.push(control);
        this.element.appendChild(control.element);
    }

    set_up_controls() {}
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
    }

    action(event) {}
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
            this.checkbox = new Checkbox(true, ["background"]);
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
            this.string.oninput = e => this.string_func(this.string.value);
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
            if (data.text !== undefined) {
                this.text = data.text;
            }
        }
    }

}

class NodeSettings extends VisibilityManagedWrapper {
    constructor(node) {
        super("div", ["settings"]);

        this.click_off_handler = e => this.click_off(e);
        this.element.onclick = e => e.stopPropagation();
        this.settings = [];

        node.element.appendChild(this.element);
        node.add_listener("contextmenu", e => {
            e.preventDefault();
            this.show();
        });

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

class SheetNode extends SheetElement {
    constructor(options) {
        super("div", ["node"], options);

        this.type = options?.type || NodeTypes.NONE;
        
        this.header = new NodeHeader(this, options);
        this.element.appendChild(this.header.element);

        this.header.controls.add_control(new Control(
            e => console.log("start drag!", this),
            {
                icon: "handle.png",
                title: "Move",
                toggle: true
            }
        ));

        this.content = null;
        this.create_content_element();
        this.set_up_content();

        this.settings = null;
        this.set_up_settings();
    }

    get value() {
        return null;
    }

    set value(data) {
        return;
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
    }

    content_json() {
        return this.value;
    }

    // Seperate method to to_json so subclasses can update this data for their
    // own to_json methods easily.
    _to_json() {
        return {
            title: this.header.title.text,
            title_active: this.header.title.visible,
            type: this.type,
            width: this.width,
            height: this.height,
            x: this.x,
            y: this.y,
            controls_active: this.controls.visible,
            font_size: this.content.style.fontSize,
            text_align: this.content.style.textAlign,
            locked: this.locked,
            content: this.content_json()
        }
    }

    to_json() {
        return this._to_json();
    }

    from_json(options) {
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
    static DEFAULT_FONT_SIZE = "10pt"; 
    static DEFAULT_VALUE = "Lorem ipsum dolor sit amet";

    constructor(options) {
        super(options);
    }

    get value() {
        return this.content.innerText;
    }

    set value(text) {
        this.content.innerText = text;
    }

    set_up_content() {
        this.content.classList.add("text");
        this.value = TextNode.DEFAULT_VALUE;
        this.content.contentEditable = true;
        this.content.spellcheck = false;
        this.content.style.fontSize = TextNode.DEFAULT_FONT_SIZE;
        this.content.style.textAlign = "left";
    }
}

class NumberNode extends SheetNode {
    static DEFAULT_FONT_SIZE = "20pt";
    static DEFAULT_VALUE = 1;

    constructor(options) {
        super(options);    

        this.default_value = options?.default_value || NumberNode.DEFAULT_VALUE;
        this.value = this.default_value;

        this.set_up_controls();
    }

    get value() {
        return parseInt(this.content.innerText);
    }

    set value(number) {
        this.content.innerText = number.toString();
    }

    reset() {
        this.value = this.default_value;
    }

    set_up_content() {
        this.content.classList.add("number");
        this.content.contentEditable = true;
        this.content.spellcheck = false;
        this.content.style.fontSize = NumberNode.DEFAULT_FONT_SIZE;
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

    to_json() {
        let json = this._to_json();
        json.default_value = this.default_value;

        return json;
    }
}

class ListNode extends SheetNode {
    static DEFAULT_FONT_SIZE = "10pt";
    static DEFAULT_BREAK_TITLE = "Break";
    static DEFAULT_ITEM_TEXT = "New item";

    constructor(options) {
        super(options);

        this._checkboxes_active = null;
        this.checkboxes_active = (options?.checkboxes_active !== undefined) ?
            options.checkboxes_active : true;

        this.set_up_controls();
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
        this.content.style.fontSize = ListNode.DEFAULT_FONT_SIZE;
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

    // Creates a new list_item or list_break and adds it to the list's content.
    add_item(is_break = false, text = "") {
        let new_item;
        if (is_break) {
            new_item = create_element("div", ["list_item", "list_break"]);
            new_item.appendChild(create_element("div", ["padding"]));
            
            let title = new Title();
            title.text = text || ListNode.DEFAULT_ITEM_TEXT;
            title.element.classList.add("list_item_content");
            new_item.appendChild(title);

            new_item.appendChild(create_element("div", ["padding"]));
            new_item.appendChild(new ListItemControlBox(new_item));
        }
        else {
            new_item = create_element("div", ["list_item"]);
            new_item.appendChild(new Checkbox(true, [], false).element);
            new_item.appendChild(create_element(
                "span",
                ["list_item_content"],
                {
                    contentEditable: true,
                    spellcheck: false,
                    innterText: ListNode.DEFAULT_ITEM_TEXT
                }
            ));
            new_item.appendChild(new ListItemControlBox(new_item).element);
        }

        new_item.style.order = this.content.children.length;
        this.content.appendChild(new_item);
    }

    to_json() {
        let json = this._to_json();

        let list_items = [];
        Array.prototype.slice.call(this.content.children).sort((a, b) =>
            (a.style.order - b.style.order)
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

        json.content = list_items;
        json.checkboxes_active = this.checkboxes_active;

        return json;
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
        this.contentEditable.fontSize = DieNode.DEFAULT_FONT_SIZE;
        this.value = DieNode.DEFAULT_VALUE;
    }

    roll() {
        this.value = Math.ceil(Math.random() * this.die_size);
    }

    to_json() {
        let json = this._to_json();
        json.die_size = this.die_size;

        return json;
    }
}

class ImageNode extends SheetNode {
    static DEFAULT_IMAGE = Icon.icon_path("cross.png");

    constructor(options) {
        super(options);

        this.image = create_element("img");
        this.image.src = options?.content?.uri || ImageNode.DEFAULT_IMAGE;
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

    to_json() {
        let json = this._to_json();

        // TODO : save and load images in indexeddb
        // probably happens in storage.js rather than here, but
        // needs to happen somewhere.

        let is_local = this.image.src.startsWith("blob:null/"); 
        json.content = {
            uri: is_local ? this.image_name : this.image.src,
            blob: is_local,
            crop: this.image.style.objectFit
        };

        return json;
    }
}

class CheckboxNode extends SheetNode {
    constructor(options) {
        super(options);

        this.checkbox = new Checkbox(true, ["background"]);
        this.content.appendChild(this.checkbox);

        this.value = (options?.content !== undefined) ? options.content : true;
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
}

class NodeGhost extends SheetElement {
    constructor(options) {
        super("div", ["node_ghost", "rounded", "offset"], options);
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
    constructor() {
        super("div", ["sheet"], {
            width: 0,
            height: 0
        });

        this.element.style.display = "grid";

        this.resize_to_screen();
    
        this.elements = [];
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
                    src: Icon.icon_path(options.icon_name || "cross.png"),
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

    constructor(sheet, icon_name, title) {
        super({
            icon_name: icon_name,
            title: title,
            onclick: e => this.handle_click(e)
        });

        this.default_image = this.image.src;
        this.sheet = sheet;
        this.in_mode = false;

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
        ModeTool.mode_tools.forEach(t => t.end());

        this.in_mode = true;
        this.image.src = Icon.icon_path(ModeTool.END_MODE_IMAGE);
        this._start();
    }

    _end() {
        // Implemented by subclasses.
    }

    end() {
        this.in_mode = false;
        this.image.src = this.default_image;
        this._end();
    }
}

class AddNodeTool extends ModeTool {
    constructor(sheet) {
        super(sheet, "add.png", "Add node");

        this.preview_ghost = null;
    }

    create_preview_ghost() {
        this.preview_ghost = new SizeablePreviewGhost({
            sheet: this.sheet,
            width: 2,
            height: 2,
            onfinish: () => {
                this.sheet.add_element(new ListNode({
                    x: this.preview_ghost.x,
                    y: this.preview_ghost.y,
                    width: this.preview_ghost.width,
                    height: this.preview_ghost.height
                }));
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

class CreateGroupTool extends ModeTool {
    constructor(sheet) {
        super(sheet, "clone.png", "Create group");

        this.preview_ghost = null;
    }

    _start() {
        this.preview_ghost = new PinnablePreviewGhost({
            sheet: this.sheet
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

    constructor(order = 1, hidden = false) {
        super("div", ["toolbar"]);

        this._order = null;
        this.order = order;

        this.tools = [];

        this.tools_element = create_element("div", ["tools"]);
        this.element.appendChild(this.tools_element);

        this.element.style.height = Toolbar.CLOSED_HEIGHT + "px";
        this.element.style.transition = "all " + Toolbar.TRANSITION_TIME + "ms";

        this._telescoped = false;
        this.telescoped = hidden;

        this.toggle_element = create_element("div", ["toolbar_toggle"]);
        this.toggle_element.appendChild(
            create_element("img", [], {src: Icon.icon_path("chevron_down.png")})
        );
        this.toggle_element.onclick = () => this.toggle_telescoped();
        this.element.appendChild(this.toggle_element);
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
            this.element.style.top = "-" + Toolbar.CLOSED_HEIGHT + "px";
            this.element.style.display = "none";
        }
        else {
            no_transition(this.element, () => this.hide());
        }
    }

    show(transition = true) {
        if (transition) {
            this.element.style.top = "0px";
            this.element.style.display = "inherit";
        }
        else {
            no_transition(this.element, () => this.show());
        }
    }

    toggle_telescoped() {
        this.telescoped = !this.telescoped;
    }

    add_tool(tool) {
        this.tools.push(tool);
        this.tools_element.appendChild(tool.element);
    }
}

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

function set_up_toolbox() {
    let toolbox = document.getElementById("toolbox");

    let main = new Toolbar();
    toolbox.appendChild(main.element);

    main.add_tool(new CreateGroupTool(sheet));
    main.add_tool(new AddNodeTool(sheet));

    // main_tools.appendChild(create_add_tool());
    // main_tools.appendChild(create_group_tool());

    // let save = create_tool("save.png");
    // save.classList.add("toggle");
    // main_tools.appendChild(save);
    // let save_menu = create_save_menu();
    // save.onclick = function () {
    //     save_menu.show();
    // };

    // let settings = create_tool("cog.png");
    // let settings_panel = create_document_settings();
    // settings.onclick = function () {
    //     settings_panel.show();
    // };
    // main_tools.appendChild(settings);

    // main.style.order = 1;
}

function end_all_tool_processes() {
    document.querySelectorAll(".tool").forEach(t => {
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

function create_new_group_tool() {
    let group = create_tool("add.png");
    let ghost = create_preview_ghost(1, 1);

    let sheet_click_handler = e => {
        if (e.target != sheet && e.target != ghost) {
            return;
        }
        
        if (ghost.pin) {
            create_node_group(ghost);
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
        group.querySelector("img").src = icon_path("add.png");
        group.active = false;
    };

    group.active = false;
    group.onclick = _ => {
        if (group.active) {
            end_group();
        }
        else {
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

function create_group_tool() {
    let toolbar = create_toolbar(0, true);
    let new_group = create_new_group_tool();
    toolbar.querySelector(".tools").appendChild(new_group);

    let group = create_tool("clone.png");
    group.active = false;

    let icon = group.querySelector("img");

    group.onclick = function () {
        if (group.active) {
            icon.src = icon_path("clone.png");
            group.active = false;
            if (new_group.active) {
                new_group.click();
            }
            toolbar.hide();
        }
        else {
            end_all_tool_processes();
            group.active = true;
            icon.src = icon_path("tick.png");
            toolbar.style.display = "inherit";
            refresh_css(toolbar);
            toolbar.show();
        }
        sheet.classList.toggle("grouping");
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
            sheet.resize();
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
            sheet.resize();
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
    sheet.querySelectorAll(".node").forEach(resize_node);
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
                        sheet.appendChild(new_node);
                    }
                ]
            ],
            true
        )
    };

    if (add_to_sheet) {
        sheet.appendChild(node);
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
    node.modifiers = null;

    NODE_TYPES.forEach(c => {
        content.classList.remove(c);
        content.classList.remove(c + "_holder");
        node.classList.remove(c + "_content");
    });
    node.classList.remove("has_default");
    
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

        let reset_btn = create_control(
            "reset.png",
            "toggle",
            "background",
            "number_reset"
        );
        reset_btn.onclick = function (e) {
            if (!isNaN(content.default_value)) {
                content.innerHTML = content.default_value.toString();
            }
        };
        header.appendChild(reset_btn);

        let calc_delta = e => (e.ctrlKey ? 10 : 1) * (e.shiftKey ? 100 : 1);

        let increment_btn = create_control("add.png", "toggle", "background");
        increment_btn.onclick = function (e) {
            content.innerHTML 
                = (parseInt(content.innerHTML, 10) + calc_delta(e)).toString();
        };
        header.appendChild(increment_btn);

        let decrement_btn 
            = create_control("subtract.png", "toggle", "background");
        decrement_btn.onclick = function (e) {
            content.innerHTML
                = (parseInt(content.innerHTML, 10) - calc_delta(e)).toString();
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

        node.modifiers = [];
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

    if (!dict["controls"]) {
        node.classList.remove("controls_inactive");
    }
    else {
        node.classList.add("controls_inactive");
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
        new_width = Math.min(new_width, sheet.width);
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

    let reset = create_element("div", ["setting", "number_content"]);
    reset.appendChild(create_label("Reset"));
    settings.appendChild(reset);

    let reset_input = create_element("input");
    let reset_default = create_element("input", null, {type: "number"});
    reset_input.type = "checkbox";
    reset_input.checked = node.classList.contains("has_default");
    reset_input.oninput = function () {
        if (reset_input.checked) {
            node.classList.add("has_default");
            if (!reset_default.values == "" && !isNaN(reset_default.value)) {
                content.default_value = parseInt(reset_default.value);
            }
            else {
                content.default_value = 1;
                reset_default.value = "1";
            }
        }
        else {
            node.classList.remove("has_default");
        }
    };
    reset.appendChild(reset_input);

    reset.appendChild(create_label("Default"));

    reset_default.oninput = function () {
        if (!isNaN(reset_default.value)) {
            content.default_value = parseInt(reset_default.value);
        }
    };
    reset.appendChild(reset_default);

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

    let text_align = create_element("span", ["setting", "font_content"]);
    settings.appendChild(text_align);

    text_align.appendChild(create_label("Text align"));

    let text_align_dropdown = create_element("select");
    ["left", "right", "center", "justify"].forEach(t => {
        let option = create_element("option");
        option.innerHTML = t;
        text_align_dropdown.appendChild(option);
    });
    text_align_dropdown.onchange = function () {
        content.style.textAlign = text_align_dropdown.value;
    };
    text_align.appendChild(text_align_dropdown);

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

    let die_mods = create_element(
        "div",
        ["setting", "list_setting", "die_content"]
    );
    settings.appendChild(die_mods);

    let die_mods_list = create_element("div", ["entry_list"]);

    let die_mods_header = create_element("div", ["header"]);
    die_mods_header.appendChild(create_label("Mods"));
    let die_mods_add = create_control("add.png");
    die_mods_add.querySelector("img").classList.add("background");
    die_mods_add.onclick = function () {
        let mod = create_element("div", ["list_item"]);
        die_mods_list.appendChild(mod);
    };
    die_mods_header.appendChild(die_mods_add);
    die_mods.appendChild(die_mods_header);

    die_mods.appendChild(die_mods_list);

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
            save_sheet(header_input.value, reload_saves);
            sheet.save_title = header_input.value;
        }
    };
    header.appendChild(save);

    let example = create_control("clone.png", "background");
    example.title = "Load Example";
    example.onclick = function () {
        fetch("/example.json").then(resp => resp.json()).then(data => {
            build_sheet({
                title: "example",
                data: data
            });
        });
    };
    header.appendChild(example);

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
        load_sheet(save.title, load_callback);
    };

    list_item.appendChild(title);

    let time = document.createElement("span");
    time.classList.add("label");
    time.innerText = new Date(save.time).toLocaleDateString("en-AU");
    list_item.appendChild(time);

    let node_count = document.createElement("span");
    node_count.classList.add("label");
    node_count.innerText = get_nodes(save).length.toString() + " nodes";
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

function create_node_ghost(node = null, width = 2, height = 2, border = 2) {
    let ghost = create_element("div", ["node_ghost", "rounded", "offset"]);

    ghost.update = function (new_width, new_height) {
        if (new_width >= 0) {
            ghost.style.width = new_width + (8 - 2 * border) + "px";
            resize_to_grid(ghost, true, false, 4);
        }
        if (new_height >= 0) {
            ghost.style.height = new_height + (8 - 2 * border) + "px";
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
        ghost.style.width = parseInt(node.style.width, 10) + (8 - 2 * border) + "px";
        ghost.style.height = parseInt(node.style.height, 10) + (8 - 2 * border) + "px";
    }
    else {
        sheet.appendChild(ghost);
        ghost.width = width;
        ghost.height = height;
        ghost.style.width = node_size(width) + (8 - 2 * border) + "px";
        ghost.style.height = node_size(height) + (8 - 2 * border) + "px";
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

    let group = create_node_ghost(null, w, h, 0);
    group.classList.remove("node_ghost");
    group.classList.add("node_group");

    snap_to_grid(group, x, y);
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

    create_context_menu(
        group,
        [["cross.png", "Delete", () => { group.remove() }, false]]
    );
}

function placement_click_to_grid_coord(e, ghost) {
    let rect = sheet.getBoundingClientRect();
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
    if (!handle) {
        handle = el;
    }

    function start_drag(e) {
        e.preventDefault();
        if (e.which !== 1) {
            return;
        }

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

    handle.addEventListener("mousedown", start_drag);
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

function create_element(tagname, classes, attributes) {
    let el = document.createElement(tagname);

    if (classes) {
        classes.forEach(c => {
            el.classList.add(c);
        });
    }

    if (attributes) {
        for ([k, v] of Object.entries(attributes)) {
            el.setAttribute(k, v);
        }
    }

    return el;
}

function sheet_offset_to_grid_coord(off_x, off_y, delta_x = 0, delta_y = 0) {
    return [
        Math.round(off_x / (NODESIZE + GAP) + delta_x),
        Math.round(off_y / (NODESIZE + GAP) + delta_y)
    ];
}
