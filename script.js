const FoodLinkAI = (() => {
    const loginOverlay = document.getElementById("loginOverlay");
    const appShell = document.getElementById("appShell");
    const loginTriggers = Array.from(document.querySelectorAll(".login-trigger"));
    const mockLoginCard = document.getElementById("mockLoginCard");
    const mockLoginForm = document.getElementById("mockLoginForm");
    const loginRoleTitle = document.getElementById("loginRoleTitle");
    const loginRoleHint = document.getElementById("loginRoleHint");
    const cancelLogin = document.getElementById("cancelLogin");
    const loginEmail = document.getElementById("loginEmail");
    const loginPassword = document.getElementById("loginPassword");
    const workspaceTitle = document.getElementById("workspaceTitle");
    const workspaceSubtitle = document.getElementById("workspaceSubtitle");
    const workspaceSectionTitle = document.getElementById("workspaceSectionTitle");
    const activeRoleBadge = document.getElementById("activeRoleBadge");
    const sessionStatusChip = document.getElementById("sessionStatusChip");
    const workspaceModeChip = document.getElementById("workspaceModeChip");
    const workspaceSignalChip = document.getElementById("workspaceSignalChip");
    const logoutButton = document.getElementById("logoutButton");
    const form = document.getElementById("surplusForm");
    const cameraButton = document.getElementById("cameraButton");
    const photoInput = document.getElementById("photoInput");
    const photoPreview = document.getElementById("photoPreview");
    const storageChips = Array.from(document.querySelectorAll("[data-storage]"));
    const panels = Array.from(document.querySelectorAll(".role-panel"));
    const resultCard = document.getElementById("resultCard");
    const urgencyBadge = document.getElementById("urgencyBadge");
    const consensusShelfLife = document.getElementById("consensusShelfLife");
    const xgBoostValue = document.getElementById("xgBoostValue");
    const tensorFlowValue = document.getElementById("tensorFlowValue");
    const notesList = document.getElementById("notesList");
    const organizerOpenCount = document.getElementById("organizerOpenCount");
    const organizerPriority = document.getElementById("organizerPriority");
    const organizerSuggestedNgo = document.getElementById("organizerSuggestedNgo");
    const organizerFeed = document.getElementById("organizerFeed");
    const ngoAvailableCount = document.getElementById("ngoAvailableCount");
    const ngoPickupWindow = document.getElementById("ngoPickupWindow");
    const ngoStatus = document.getElementById("ngoStatus");
    const ngoFeed = document.getElementById("ngoFeed");
    const claimButton = document.getElementById("claimButton");
    const receivedButton = document.getElementById("receivedButton");
    const assignedFeed = document.getElementById("assignedFeed");
    const ngoHistoryFeed = document.getElementById("ngoHistoryFeed");
    const adminHistoryFeed = document.getElementById("adminHistoryFeed");
    const railRole = document.getElementById("railRole");
    const railPrimaryTool = document.getElementById("railPrimaryTool");
    const railLiveSignal = document.getElementById("railLiveSignal");
    const activityFeed = document.getElementById("activityFeed");

    const baseShelfLifeHours = {
        "Cooked Rice": 6,
        Curry: 5,
        Bread: 12,
        Dairy: 4,
        Fruits: 10,
        "Sealed Packets": 24
    };

    let selectedStorage = "Room Temperature";
    let latestPosting = null;
    let pendingRole = null;
    const orders = [];

    const ROLE_CONFIG = {
        hotel: {
            title: "Hotel Partner Workspace",
            badge: "Hotel Partner",
            panelId: "hotelPanel",
            loginTitle: "Hotel Partner Login",
            loginHint: "Use this workspace to publish surplus food and review Freshness AI output.",
            subtitle: "Manage hotel-side surplus posting, image upload, and AI freshness assessment.",
            sectionTitle: "Hotel operations",
            primaryTool: "Post Surplus"
        },
        ngo: {
            title: "NGO Partner Workspace",
            badge: "NGO Partner",
            panelId: "ngoPanel",
            loginTitle: "NGO Partner Login",
            loginHint: "Use this workspace to review available pickups and claim collection windows.",
            subtitle: "Track available pickups, freshness windows, and route-ready collection opportunities.",
            sectionTitle: "NGO operations",
            primaryTool: "Available Pickups"
        },
        admin: {
            title: "FoodLink Admin Workspace",
            badge: "FoodLink Admin",
            panelId: "adminPanel",
            loginTitle: "FoodLink Admin Login",
            loginHint: "Use this workspace to oversee matching, dispatch rules, and NGO verification.",
            subtitle: "Oversee cross-platform dispatch, NGO verification, and global matching decisions.",
            sectionTitle: "Admin command center",
            primaryTool: "Global Matching Engine"
        }
    };

    function prependActivity(tag, title, detail) {
        const item = document.createElement("div");
        item.className = "activity-item";
        item.innerHTML = `
            <span class="activity-tag">${tag}</span>
            <strong>${title}</strong>
            <p>${detail}</p>
        `;

        activityFeed.prepend(item);

        while (activityFeed.children.length > 5) {
            activityFeed.removeChild(activityFeed.lastElementChild);
        }
    }

    function estimateAmbientTemperature(storageCondition) {
        if (storageCondition === "Frozen") return -5;
        if (storageCondition === "Refrigerated") return 4;
        return 28;
    }

    function runXGBoostShelfLifeModel({ foodType, storageCondition }) {
        const baseHours = baseShelfLifeHours[foodType] || 6;
        const temperature = estimateAmbientTemperature(storageCondition);

        let modifier = 1;
        if (temperature >= 25) modifier = 0.55;
        if (temperature <= 4) modifier = 1.3;
        if (temperature < 0) modifier = 1.6;

        return Number((baseHours * modifier).toFixed(1));
    }

    function runTensorFlowSpoilageModel({ foodType, hasImage }) {
        const defaults = {
            "Cooked Rice": 5.4,
            Curry: 4.8,
            Bread: 11.2,
            Dairy: 3.7,
            Fruits: 9.1,
            "Sealed Packets": 20.5
        };

        const baseline = defaults[foodType] || 6;
        return Number((hasImage ? baseline : baseline - 1.5).toFixed(1));
    }

    function calculateConsensusShelfLife(xgBoostHours, tensorFlowHours) {
        return Number((((xgBoostHours + tensorFlowHours) / 2)).toFixed(1));
    }

    function getUrgencyBadge(hours) {
        if (hours < 2) return "Red";
        if (hours < 6) return "Amber";
        return "Green";
    }

    function recommendNgo(foodType, quantityKg) {
        if (foodType === "Dairy" || foodType === "Fruits") return "Sunrise Nutrition Trust";
        if (quantityKg >= 15) return "City Harvest Network";
        return "Hope Community Kitchen";
    }

    function getPickupWindow(urgency) {
        if (urgency === "Red") return "Pickup within 1 hour";
        if (urgency === "Amber") return "Pickup within 3 hours";
        return "Pickup within 6 hours";
    }

    function renderUrgencyBadge(element, badge) {
        element.textContent = badge;
        element.className = "pill pill-urgency";
        element.classList.add(`urgency-${badge.toLowerCase()}`);
    }

    function buildOrderCard(order, stateClass, actionMarkup = "") {
        const statusMap = {
            pending_verification: { label: "Pending Verification", className: "status-pending" },
            approved: { label: "Approved", className: "status-approved" },
            assigned: { label: "Assigned", className: "status-assigned" },
            completed: { label: "Completed", className: "status-completed" }
        };

        const statusConfig = statusMap[order.status] || {
            label: "In Progress",
            className: "status-pending"
        };

        return `
            <article class="status-card ${stateClass}">
                <div class="status-topline">
                    <strong>${order.hotelName}</strong>
                    <div class="inline-actions">
                        <span class="status-pill ${statusConfig.className}">${statusConfig.label}</span>
                        <span class="pill pill-urgency urgency-${order.prediction.urgencyBadge.toLowerCase()}">${order.prediction.urgencyBadge}</span>
                    </div>
                </div>
                <div class="status-meta">
                    <div>
                        <span>Food Type</span>
                        <strong>${order.foodType}</strong>
                    </div>
                    <div>
                        <span>Quantity</span>
                        <strong>${order.quantityKg} kg</strong>
                    </div>
                    <div>
                        <span>Storage</span>
                        <strong>${order.storageCondition}</strong>
                    </div>
                    <div>
                        <span>Cook Time</span>
                        <strong>${order.cookTime}</strong>
                    </div>
                    <div>
                        <span>Suggested NGO</span>
                        <strong>${order.recommendedNgo}</strong>
                    </div>
                    <div>
                        <span>Shelf Life</span>
                        <strong>${order.prediction.consensusShelfLifeHours.toFixed(1)} hrs</strong>
                    </div>
                </div>
                ${actionMarkup}
            </article>
        `;
    }

    function getPendingOrder() {
        return orders.find((order) => order.status === "pending_verification") || null;
    }

    function getApprovedOrder() {
        return orders.find((order) => order.status === "approved") || null;
    }

    function getAssignedOrder() {
        return orders.find((order) => order.status === "assigned") || null;
    }

    function getCompletedOrders() {
        return orders.filter((order) => order.status === "completed");
    }

    function predictFreshness({ foodType, storageCondition, hasImage }) {
        const xgBoostShelfLifeHours = runXGBoostShelfLifeModel({
            foodType,
            storageCondition
        });

        const tensorFlowShelfLifeHours = runTensorFlowSpoilageModel({
            foodType,
            hasImage
        });

        const consensusShelfLifeHours = calculateConsensusShelfLife(
            xgBoostShelfLifeHours,
            tensorFlowShelfLifeHours
        );

        return {
            xgBoostShelfLifeHours,
            tensorFlowShelfLifeHours,
            consensusShelfLifeHours,
            urgencyBadge: getUrgencyBadge(consensusShelfLifeHours),
            notes: [
                "TensorFlow CNN placeholder evaluates the uploaded photo for spoilage cues.",
                "XGBoost placeholder estimates shelf life from food type and storage condition.",
                "FoodLink AI combines both outputs into one dispatch decision."
            ]
        };
    }

    function showRoleDashboard(role) {
        const config = ROLE_CONFIG[role];
        if (!config) return;

        panels.forEach((panel) => {
            panel.classList.toggle("active", panel.id === config.panelId);
        });

        workspaceTitle.textContent = config.title;
        workspaceSubtitle.textContent = config.subtitle;
        workspaceSectionTitle.textContent = config.sectionTitle;
        activeRoleBadge.textContent = config.badge;
        railRole.textContent = config.badge;
        railPrimaryTool.textContent = config.primaryTool;
        railLiveSignal.textContent = "Workspace active";
        sessionStatusChip.textContent = "Authenticated";
        workspaceModeChip.textContent = config.badge;
        workspaceSignalChip.textContent = `Primary: ${config.primaryTool}`;
    }

    function renderOrganizerView() {
        const pendingOrder = getPendingOrder();
        const completedOrders = getCompletedOrders();

        organizerOpenCount.textContent = orders.filter((order) => order.status !== "completed").length.toString();
        organizerPriority.textContent = pendingOrder ? "1 pending" : "0 pending";
        organizerSuggestedNgo.textContent = pendingOrder ? pendingOrder.recommendedNgo : "Awaiting post";

        if (!pendingOrder) {
            organizerFeed.className = "feed-empty";
            organizerFeed.textContent = "Publish a hotel surplus item to send it for organizer verification.";
        } else {
            organizerFeed.className = "stack-list";
            organizerFeed.innerHTML = buildOrderCard(
                pendingOrder,
                "pending",
                `<div class="inline-actions">
                    <button type="button" class="button button-primary" data-approve-order="${pendingOrder.id}">Verify and Send to NGO</button>
                </div>`
            );
        }

        if (!completedOrders.length) {
            adminHistoryFeed.className = "feed-empty";
            adminHistoryFeed.textContent = "Completed deliveries will appear here after NGO confirmation.";
        } else {
            adminHistoryFeed.className = "stack-list";
            adminHistoryFeed.innerHTML = completedOrders
                .map((order) => buildOrderCard(order, "completed"))
                .join("");
        }
    }

    function renderNgoView() {
        const approvedOrder = getApprovedOrder();
        const assignedOrder = getAssignedOrder();
        const completedOrders = getCompletedOrders();

        ngoAvailableCount.textContent = approvedOrder ? "1" : "0";
        ngoPickupWindow.textContent = approvedOrder ? approvedOrder.pickupWindow : assignedOrder ? assignedOrder.pickupWindow : "Awaiting post";
        ngoStatus.textContent = assignedOrder ? "Assigned" : approvedOrder ? "Ready to claim" : "Pending";
        claimButton.disabled = !approvedOrder;
        claimButton.textContent = approvedOrder ? "Claim Pickup" : "Claim Unavailable";
        receivedButton.disabled = !assignedOrder;

        if (!approvedOrder) {
            ngoFeed.className = "feed-empty";
            ngoFeed.textContent = "No organizer-approved pickup yet. Orders appear here only after organizer verification.";
        } else {
            ngoFeed.className = "stack-list";
            ngoFeed.innerHTML = buildOrderCard(approvedOrder, "pending");
        }

        if (!assignedOrder) {
            assignedFeed.className = "feed-empty";
            assignedFeed.textContent = "No assigned delivery yet. Claim a verified pickup to move it here.";
        } else {
            assignedFeed.className = "stack-list";
            assignedFeed.innerHTML = buildOrderCard(assignedOrder, "assigned");
        }

        if (!completedOrders.length) {
            ngoHistoryFeed.className = "feed-empty";
            ngoHistoryFeed.textContent = "Completed NGO deliveries will be saved here.";
        } else {
            ngoHistoryFeed.className = "stack-list";
            ngoHistoryFeed.innerHTML = completedOrders
                .map((order) => buildOrderCard(order, "completed"))
                .join("");
        }
    }

    function openMockLogin(role) {
        pendingRole = role;
        loginRoleTitle.textContent = ROLE_CONFIG[role].loginTitle;
        loginRoleHint.textContent = ROLE_CONFIG[role].loginHint;
        mockLoginForm.reset();
        mockLoginCard.classList.remove("hidden");
        loginEmail.focus();
    }

    function resetMockLogin() {
        pendingRole = null;
        mockLoginForm.reset();
        mockLoginCard.classList.add("hidden");
    }

    function handleLogin(role) {
        const email = loginEmail.value.trim();
        const password = loginPassword.value.trim();

        if (!email || !password) {
            window.alert("Enter email and password to continue.");
            return;
        }

        loginOverlay.classList.add("hidden");
        appShell.classList.remove("app-hidden");
        showRoleDashboard(role);
        prependActivity("Login", ROLE_CONFIG[role].badge, `Entered ${ROLE_CONFIG[role].title}.`);
        resetMockLogin();
    }

    function refreshAllViews() {
        latestPosting = orders[orders.length - 1] || null;
        renderOrganizerView();
        renderNgoView();
    }

    cameraButton.addEventListener("click", () => {
        photoInput.click();
    });

    photoInput.addEventListener("change", () => {
        const [file] = photoInput.files || [];
        if (!file) return;

        const objectUrl = URL.createObjectURL(file);
        photoPreview.src = objectUrl;
        photoPreview.classList.remove("hidden");
    });

    storageChips.forEach((chip) => {
        chip.addEventListener("click", () => {
            selectedStorage = chip.dataset.storage;
            storageChips.forEach((item) => item.classList.remove("active"));
            chip.classList.add("active");
        });
    });

    loginTriggers.forEach((trigger) => {
        trigger.addEventListener("click", () => {
            openMockLogin(trigger.dataset.role);
        });
    });

    cancelLogin.addEventListener("click", () => {
        resetMockLogin();
    });

    mockLoginForm.addEventListener("submit", (event) => {
        event.preventDefault();

        if (pendingRole) {
            handleLogin(pendingRole);
        }
    });

    logoutButton.addEventListener("click", () => {
        loginOverlay.classList.remove("hidden");
        appShell.classList.add("app-hidden");
        activeRoleBadge.textContent = "Not logged in";
        workspaceTitle.textContent = "Multi-interface demo";
        workspaceSubtitle.textContent = "Role-specific workflows for publishing surplus, dispatching pickups, and verifying NGO operations.";
        workspaceSectionTitle.textContent = "Operations overview";
        railRole.textContent = "Not logged in";
        railPrimaryTool.textContent = "Select a role";
        railLiveSignal.textContent = "Idle";
        sessionStatusChip.textContent = "Demo session";
        workspaceModeChip.textContent = "Ready";
        workspaceSignalChip.textContent = "Waiting for activity";
        panels.forEach((panel) => panel.classList.remove("active"));
        prependActivity("Logout", "Session ended", "Returned to the role selection overlay.");
    });

    claimButton.addEventListener("click", () => {
        const approvedOrder = getApprovedOrder();
        if (!approvedOrder) return;

        approvedOrder.status = "assigned";
        refreshAllViews();
        railLiveSignal.textContent = "Pickup claimed";
        workspaceSignalChip.textContent = "Claim recorded";
        prependActivity("NGO", "Pickup claimed", `${approvedOrder.recommendedNgo} claimed ${approvedOrder.foodType} from ${approvedOrder.hotelName}.`);
    });

    receivedButton.addEventListener("click", () => {
        const assignedOrder = getAssignedOrder();
        if (!assignedOrder) return;

        assignedOrder.status = "completed";
        refreshAllViews();
        ngoStatus.textContent = "Completed";
        railLiveSignal.textContent = "Delivery completed";
        workspaceSignalChip.textContent = "History updated";
        prependActivity("NGO", "Delivery received", `${assignedOrder.recommendedNgo} marked delivery complete for ${assignedOrder.foodType}.`);
        prependActivity("Admin", "Order completed", `${assignedOrder.hotelName} order moved to completed delivery history.`);
    });

    form.addEventListener("reset", () => {
        selectedStorage = "Room Temperature";
        storageChips.forEach((chip) => {
            chip.classList.toggle("active", chip.dataset.storage === selectedStorage);
        });
        photoPreview.src = "";
        photoPreview.classList.add("hidden");
        resultCard.classList.add("hidden");
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const hotelName = document.getElementById("hotelName").value.trim();
        const foodType = document.getElementById("foodType").value;
        const quantityKg = Number(document.getElementById("quantityKg").value);
        const cookTime = document.getElementById("cookTime").value;
        const hasImage = Boolean((photoInput.files || []).length);

        if (!hotelName || !quantityKg || quantityKg <= 0 || !cookTime) {
            window.alert("Enter the hotel name, a valid quantity, and cook time.");
            return;
        }

        const prediction = predictFreshness({
            foodType,
            storageCondition: selectedStorage,
            hasImage
        });

        latestPosting = {
            id: `${Date.now()}`,
            hotelName,
            foodType,
            quantityKg: quantityKg.toFixed(1),
            cookTime,
            storageCondition: selectedStorage,
            prediction,
            recommendedNgo: recommendNgo(foodType, quantityKg),
            pickupWindow: getPickupWindow(prediction.urgencyBadge),
            status: "pending_verification"
        };

        orders.push(latestPosting);

        consensusShelfLife.textContent = `${prediction.consensusShelfLifeHours.toFixed(1)} hrs`;
        xgBoostValue.textContent = `${prediction.xgBoostShelfLifeHours.toFixed(1)} hrs`;
        tensorFlowValue.textContent = `${prediction.tensorFlowShelfLifeHours.toFixed(1)} hrs`;
        renderUrgencyBadge(urgencyBadge, prediction.urgencyBadge);

        notesList.innerHTML = "";
        prediction.notes.forEach((note) => {
            const li = document.createElement("li");
            li.textContent = note;
            notesList.appendChild(li);
        });

        resultCard.classList.remove("hidden");
        refreshAllViews();
        railLiveSignal.textContent = `${prediction.urgencyBadge} urgency`;
        workspaceSignalChip.textContent = "Pending organizer verification";
        prependActivity("Hotel", "Order submitted", `${hotelName} posted ${quantityKg.toFixed(1)} kg of ${foodType} for organizer verification.`);
        prependActivity("Admin", "Verification required", `New hotel order is waiting for organizer approval before NGO dispatch.`);
    });

    document.addEventListener("click", (event) => {
        const approveButton = event.target.closest("[data-approve-order]");
        if (!approveButton) return;

        const order = orders.find((item) => item.id === approveButton.dataset.approveOrder);
        if (!order) return;

        order.status = "approved";
        refreshAllViews();
        railLiveSignal.textContent = "Verified by organizer";
        workspaceSignalChip.textContent = `Ready for ${order.recommendedNgo}`;
        prependActivity("Admin", "Order verified", `${order.hotelName} order was approved and released to NGO pickup queue.`);
        prependActivity("NGO", "Pickup available", `${order.recommendedNgo} can now claim ${order.foodType} from ${order.hotelName}.`);
    });

    renderOrganizerView();
    renderNgoView();

    return {
        handleLogin,
        predictFreshness
    };
})();
