(() => {
    const api = "/api";
    const issueList = document.querySelector("#issue-list");
    const dialog = document.querySelector("#ticket-dialog");
    const form = document.querySelector("#ticket-form");
    const formError = document.querySelector("#form-error");
    const toast = document.querySelector("#toast");
    const searchInput = document.querySelector("#search-input");
    const assigneeSelect = document.querySelector("#ticket-assignee");
    let issues = [];
    let users = [];
    let activeFilter = "all";
    let toastTimer;

    async function request(url, options = {}) {
        const response = await fetch(url, {
            headers: { "Content-Type": "application/json", ...options.headers },
            ...options,
        });
        if (!response.ok) {
            let detail = `Request failed (${response.status})`;
            try {
                const payload = await response.json();
                if (payload.error) detail = payload.error;
            } catch {
                // Keep the HTTP status message when the server does not return JSON.
            }
            throw new Error(detail);
        }
        return response.status === 204 ? null : response.json();
    }

    function showToast(message, isError = false) {
        toast.textContent = message;
        toast.classList.toggle("toast-error", isError);
        toast.classList.add("show");
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3200);
    }

    function updateSummary() {
        document.querySelector("#total-count").textContent = issues.length;
        document.querySelector("#open-count").textContent = issues.filter(issue => issue.status === "open").length;
        document.querySelector("#progress-count").textContent = issues.filter(issue => issue.status === "in_progress").length;
        document.querySelector("#done-count").textContent = issues.filter(issue => issue.status === "done").length;
    }

    function addText(parent, tag, className, value) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        element.textContent = value;
        parent.append(element);
        return element;
    }

    function renderIssue(issue, index) {
        const row = document.createElement("article");
        row.className = "issue-row";
        row.style.animationDelay = `${Math.min(index, 8) * 35}ms`;

        const main = document.createElement("div");
        main.className = "issue-main";
        const marker = addText(main, "span", "issue-marker", "✳");
        marker.setAttribute("aria-hidden", "true");
        const copy = document.createElement("div");
        copy.className = "issue-copy";
        const title = document.createElement("p");
        title.className = "issue-title";
        addText(title, "span", "issue-id", `ORB-${String(issue.id).padStart(3, "0")}`);
        title.append(document.createTextNode(issue.title));
        copy.append(title);
        if (issue.description) addText(copy, "p", "issue-description", issue.description);
        main.append(copy);
        row.append(main);

        const statusCell = document.createElement("div");
        statusCell.className = "issue-status";
        const status = document.createElement("select");
        status.className = `status-select status-${issue.status}`;
        status.setAttribute("aria-label", `Status for ${issue.title}`);
        [["open", "Open"], ["in_progress", "In progress"], ["done", "Completed"]].forEach(([value, label]) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
            option.selected = issue.status === value;
            status.append(option);
        });
        status.addEventListener("change", () => updateIssue(issue.id, { status: status.value }));
        statusCell.append(status);
        row.append(statusCell);

        const priority = addText(row, "span", `priority-label priority-${issue.priority}`, issue.priority);
        priority.classList.add("issue-priority");
        addText(row, "span", "assignee-label issue-assignee", issue.assignee || "Unassigned");

        const remove = addText(row, "button", "delete-button", "×");
        remove.type = "button";
        remove.setAttribute("aria-label", `Delete ${issue.title}`);
        remove.addEventListener("click", () => deleteIssue(issue));
        return row;
    }

    function renderIssues() {
        const term = searchInput.value.trim().toLocaleLowerCase();
        const visibleIssues = issues.filter(issue => {
            const matchesFilter = activeFilter === "all" || issue.status === activeFilter;
            const searchable = `${issue.title} ${issue.description} ${issue.assignee || ""}`.toLocaleLowerCase();
            return matchesFilter && searchable.includes(term);
        });
        document.querySelector("#visible-count").textContent = visibleIssues.length;
        issueList.replaceChildren();

        if (!visibleIssues.length) {
            const empty = document.createElement("div");
            empty.className = "empty-state";
            addText(empty, "strong", "", issues.length ? "No issues match this view" : "A clear sky. For now.");
            addText(empty, "p", "", issues.length ? "Try another filter or search term." : "Create your first issue and keep the momentum going.");
            issueList.append(empty);
            return;
        }
        visibleIssues.forEach((issue, index) => issueList.append(renderIssue(issue, index)));
    }

    async function loadIssues() {
        issueList.replaceChildren();
        const loading = document.createElement("div");
        loading.className = "loading-state";
        const spinner = document.createElement("span");
        spinner.className = "spinner";
        spinner.setAttribute("aria-hidden", "true");
        loading.append(spinner, document.createTextNode("Gathering your issues..."));
        issueList.append(loading);
        try {
            issues = await request(`${api}/tickets`);
            updateSummary();
            renderIssues();
        } catch (error) {
            issueList.replaceChildren();
            const state = document.createElement("div");
            state.className = "error-state";
            addText(state, "strong", "", "Couldn't load your issues");
            addText(state, "p", "", error.message);
            const retry = addText(state, "button", "retry-button", "Try again");
            retry.type = "button";
            retry.addEventListener("click", loadIssues);
            issueList.append(state);
            document.querySelector("#total-count").textContent = "!";
            document.querySelector("#open-count").textContent = "!";
            document.querySelector("#progress-count").textContent = "!";
            document.querySelector("#done-count").textContent = "!";
        }
    }

    async function loadUsers() {
        try {
            users = await request(`${api}/users`);
            users.forEach(user => {
                const option = document.createElement("option");
                option.value = user.id;
                option.textContent = user.name;
                assigneeSelect.append(option);
            });
        } catch (error) {
            showToast(`Could not load assignees: ${error.message}`, true);
        }
    }

    async function updateIssue(id, changes) {
        try {
            const updated = await request(`${api}/tickets/${id}`, {
                method: "PUT",
                body: JSON.stringify(changes),
            });
            issues = issues.map(issue => issue.id === id ? updated : issue);
            updateSummary();
            renderIssues();
            showToast("Issue status updated.");
        } catch (error) {
            showToast(`Couldn't update issue: ${error.message}`, true);
            renderIssues();
        }
    }

    async function deleteIssue(issue) {
        if (!window.confirm(`Delete "${issue.title}"? This can't be undone.`)) return;
        try {
            await request(`${api}/tickets/${issue.id}`, { method: "DELETE" });
            issues = issues.filter(item => item.id !== issue.id);
            updateSummary();
            renderIssues();
            showToast("Issue deleted.");
        } catch (error) {
            showToast(`Couldn't delete issue: ${error.message}`, true);
        }
    }

    document.querySelector("#open-ticket-form").addEventListener("click", () => {
        form.reset();
        formError.hidden = true;
        dialog.showModal();
        document.querySelector("#ticket-title").focus();
    });
    document.querySelector("#close-ticket-form").addEventListener("click", () => dialog.close());
    document.querySelector("#cancel-ticket-form").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => {
        if (event.target === dialog) dialog.close();
    });
    form.addEventListener("submit", async event => {
        event.preventDefault();
        formError.hidden = true;
        const submit = document.querySelector("#submit-ticket");
        submit.disabled = true;
        submit.textContent = "Creating...";
        const formData = new FormData(form);
        const data = {
            title: formData.get("title").trim(),
            description: formData.get("description").trim(),
            priority: formData.get("priority"),
        };
        const assigneeId = formData.get("assignee_id");
        if (assigneeId) data.assignee_id = Number(assigneeId);
        try {
            await request(`${api}/tickets`, { method: "POST", body: JSON.stringify(data) });
            dialog.close();
            showToast("Your new issue is on the board.");
            await loadIssues();
        } catch (error) {
            formError.textContent = error.message;
            formError.hidden = false;
        } finally {
            submit.disabled = false;
            submit.innerHTML = 'Create issue <span aria-hidden="true">↗</span>';
        }
    });
    document.querySelectorAll(".filter-chip").forEach(button => {
        button.addEventListener("click", () => {
            activeFilter = button.dataset.filter;
            document.querySelectorAll(".filter-chip").forEach(chip => chip.classList.toggle("selected", chip === button));
            renderIssues();
        });
    });
    searchInput.addEventListener("input", renderIssues);
    document.addEventListener("keydown", event => {
        if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
            event.preventDefault();
            searchInput.focus();
        }
    });

    loadIssues();
    loadUsers();
})();
