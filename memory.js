const NobitMemory = {
    data: {},

    save(key, value) {
        this.data[key] = value;

        localStorage.setItem(
            "nobitMemory",
            JSON.stringify(this.data)
        );
    },

    get(key) {
        return this.data[key];
    },

    remove(key) {
        delete this.data[key];

        localStorage.setItem(
            "nobitMemory",
            JSON.stringify(this.data)
        );
    },

    clear() {
        this.data = {};
        localStorage.removeItem("nobitMemory");
    },

    load() {
        const saved = localStorage.getItem("nobitMemory");

        if (saved) {
            try {
                this.data = JSON.parse(saved);
            } catch {
                this.data = {};
            }
        }
    }
};

NobitMemory.load();
