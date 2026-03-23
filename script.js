const FoodLinkAI = (() => {
    const loginOverlay = document.getElementById("loginOverlay");
    const appShell = document.getElementById("appShell");
    const loginTriggers = Array.from(document.querySelectorAll(".login-trigger"));
    const mockLoginCard = document.getElementById("mockLoginCard");
    const mockLoginForm = document.getElementById("mockLoginForm");
    const loginRoleTitle = document.getElementById("loginRoleTitle");
    const cancelLogin = document.getElementById("cancelLogin");
    const loginEmail = document.getElementById("loginEmail");
    const loginPassword = document.getElementById("loginPassword");
    const workspaceTitle = document.getElementById("workspaceTitle");
    const activeRoleBadge = document.getElementById("activeRoleBadge");
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

    const ROLE_CONFIG = {
        hotel: {
            title: "Hotel Partner Workspace",
            badge: "Hotel Partner",
            panelId: "hotelPanel",
            loginTitle: "Hotel Partner Login"
        },
        ngo: {
            title: "NGO Partner Workspace",
            badge: "NGO Partner",
            panelId: "ngoPanel",
            loginTitle: "NGO Partner Login"
        },
        admin: {
            title: "FoodLink Admin Workspace",
            badge: "FoodLink Admin",
            panelId: "adminPanel",
            loginTitle: "FoodLink Admin Login"
        }
    };

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
        activeRoleBadge.textContent = config.badge;
    }

    function renderOrganizerView(posting) {
        organizerOpenCount.textContent = posting ? "1" : "0";
        organizerPriority.textContent = posting ? posting.prediction.urgencyBadge : "None";
        organizerSuggestedNgo.textContent = posting ? posting.recommendedNgo : "Awaiting post";

        if (!posting) {
            organizerFeed.className = "feed-empty";
            organizerFeed.textContent = "Publish a hotel surplus item to populate organizer routing details.";
            return;
        }

        organizerFeed.className = "";
        organizerFeed.innerHTML = `
            <article class="feed-card">
                <div class="feed-title">
                    <strong>${posting.hotelName}</strong>
                    <span class="pill pill-urgency urgency-${posting.prediction.urgencyBadge.toLowerCase()}">${posting.prediction.urgencyBadge}</span>
                </div>
                <div class="feed-grid">
                    <div>
                        <span>Food Type</span>
                        <strong>${posting.foodType}</strong>
                    </div>
                    <div>
                        <span>Quantity</span>
                        <strong>${posting.quantityKg} kg</strong>
                    </div>
                    <div>
                        <span>Storage</span>
                        <strong>${posting.storageCondition}</strong>
                    </div>
                    <div>
                        <span>Cook Time</span>
                        <strong>${posting.cookTime}</strong>
                    </div>
                    <div>
                        <span>Consensus Shelf Life</span>
                        <strong>${posting.prediction.consensusShelfLifeHours.toFixed(1)} hrs</strong>
                    </div>
                    <div>
                        <span>Recommended NGO</span>
                        <strong>${posting.recommendedNgo}</strong>
                    </div>
                </div>
                <p class="meta-line">Dispatch note: prioritize ${posting.pickupWindow.toLowerCase()} and notify the matched NGO immediately.</p>
            </article>
        `;
    }

    function renderNgoView(posting, claimed = false) {
        ngoAvailableCount.textContent = posting ? "1" : "0";
        ngoPickupWindow.textContent = posting ? posting.pickupWindow : "Awaiting post";
        ngoStatus.textContent = claimed ? "Claimed" : posting ? "Ready to claim" : "Pending";
        claimButton.disabled = !posting || claimed;
        claimButton.textContent = claimed ? "Pickup Claimed" : "Claim Pickup";

        if (!posting) {
            ngoFeed.className = "feed-empty";
            ngoFeed.textContent = "No food listing yet. Once a hotel publishes a surplus batch, NGOs can claim it here.";
            return;
        }

        ngoFeed.className = "";
        ngoFeed.innerHTML = `
            <article class="feed-card">
                <div class="feed-title">
                    <strong>${posting.recommendedNgo}</strong>
                    <span class="pill">${claimed ? "Assigned" : "Available"}</span>
                </div>
                <div class="feed-grid">
                    <div>
                        <span>Pickup From</span>
                        <strong>${posting.hotelName}</strong>
                    </div>
                    <div>
                        <span>Food Batch</span>
                        <strong>${posting.foodType}</strong>
                    </div>
                    <div>
                        <span>Quantity</span>
                        <strong>${posting.quantityKg} kg</strong>
                    </div>
                    <div>
                        <span>Freshness Window</span>
                        <strong>${posting.pickupWindow}</strong>
                    </div>
                    <div>
                        <span>Storage Condition</span>
                        <strong>${posting.storageCondition}</strong>
                    </div>
                    <div>
                        <span>Urgency</span>
                        <strong>${posting.prediction.urgencyBadge}</strong>
                    </div>
                </div>
            </article>
        `;
    }

    function openMockLogin(role) {
        pendingRole = role;
        loginRoleTitle.textContent = ROLE_CONFIG[role].loginTitle;
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
        resetMockLogin();
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
        panels.forEach((panel) => panel.classList.remove("active"));
    });

    claimButton.addEventListener("click", () => {
        if (!latestPosting) return;
        renderNgoView(latestPosting, true);
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
            hotelName,
            foodType,
            quantityKg: quantityKg.toFixed(1),
            cookTime,
            storageCondition: selectedStorage,
            prediction,
            recommendedNgo: recommendNgo(foodType, quantityKg),
            pickupWindow: getPickupWindow(prediction.urgencyBadge)
        };

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
        renderOrganizerView(latestPosting);
        renderNgoView(latestPosting, false);
    });

    renderOrganizerView(null);
    renderNgoView(null, false);

    return {
        handleLogin,
        predictFreshness
    };
})();
