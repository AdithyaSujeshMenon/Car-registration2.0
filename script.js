document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const carForm = document.getElementById("carForm");
    const carList = document.getElementById("carList");
    const viewReportBtn = document.getElementById("viewReportBtn");
    const todayReportBtn = document.getElementById("todayReportBtn");
    const clearAllBtn = document.getElementById("clearAll");
    const paginationControls = document.getElementById("paginationControls");
    const filterType = document.getElementById("filterType");
    const navButtons = document.querySelectorAll(".nav-btn");
    const sections = document.querySelectorAll(".content-section");
    const exportButtons = document.querySelectorAll("[id^='export']");

    // Modals
    const carDetailsModal = document.getElementById("carDetailsModal");
    const reportModal = document.getElementById("reportModal");
    const authModal = document.getElementById("authModal");
    const successModal = document.getElementById("successModal");

    // Close buttons
    const closeButtons = document.querySelectorAll(".close-modal");

    // Other Elements
    const deleteModalBtn = document.getElementById("deleteModalBtn");
    const modalVehicleNumber = document.getElementById("modalVehicleNumber");
    const modalCarDetails = document.getElementById("modalCarDetails");
    const passcodeInput = document.getElementById("passcodeInput");
    const submitPasscodeBtn = document.getElementById("submitPasscodeBtn");
    const authMessage = document.getElementById("authMessage");
    const successMessage = document.getElementById("successMessage");

    // Constants
    const ITEMS_PER_PAGE = 12;
    const PASSCODE = '000000';

    // State Management
    let vehicles = JSON.parse(localStorage.getItem("vehicles")) || [];
    let exemptVehicles = JSON.parse(localStorage.getItem("exemptVehicles")) || [];
    let currentPage = 1;
    let selectedVehicle = null;
    let currentAction = null;

    // Helper Functions
    const formatDate = (date) => {
        const options = { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit', 
            hour12: false 
        };
        return new Date(date).toLocaleString('en-CA', options).replace(',', '');
    };

    const saveToLocalStorage = (key, data) => {
        localStorage.setItem(key, JSON.stringify(data));
    };

    const showModal = (modal, sourceElement = null) => {
        if (sourceElement) {
            const rect = sourceElement.getBoundingClientRect();
            modal.style.transformOrigin = `${rect.left + rect.width/2}px ${rect.top + rect.height/2}px`;
        }
        modal.style.display = "block";
        setTimeout(() => modal.classList.add("show"), 10);
    };

    const hideModal = (modal) => {
        modal.classList.remove("show");
        setTimeout(() => {
            modal.style.display = "none";
            // Reset any forms inside the modal
            const form = modal.querySelector("form");
            if (form) form.reset();
        }, 300);
    };

    const showSuccess = (message, duration = 3000) => {
        successMessage.textContent = message;
        showModal(successModal);
        setTimeout(() => hideModal(successModal), duration);
    };

    // Navigation Functions
    const switchSection = (sectionId) => {
        sections.forEach(section => {
            section.classList.remove("active");
            if (section.id === sectionId) {
                section.classList.add("active");
            }
        });

        navButtons.forEach(btn => {
            btn.classList.remove("active");
            if (btn.dataset.section === sectionId) {
                btn.classList.add("active");
            }
        });
    };

    // Filter Functions
    const filterVehicles = () => {
        let filtered = [...vehicles];

        if (filterType.value === 'exempt') {
            filtered = filtered.filter(v => exemptVehicles.includes(v.vehicleNumber));
        } else if (filterType.value === 'non-exempt') {
            filtered = filtered.filter(v => !exemptVehicles.includes(v.vehicleNumber));
        }

        const startDate = document.getElementById("startDate").value;
        const endDate = document.getElementById("endDate").value;

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59);

            filtered = filtered.filter(v => {
                const date = new Date(v.date);
                return date >= start && date <= end;
            });
        }

        return filtered;
    };

    // Vehicle Management Functions
    const addVehicle = (vehicleData) => {
        vehicles.unshift({
            ...vehicleData,
            date: formatDate(new Date())
        });
        saveToLocalStorage("vehicles", vehicles);
        renderVehicleList();
        showSuccess("Vehicle registered successfully");
    };

    const deleteVehicle = (vehicle) => {
        const deleteBtn = deleteModalBtn;
        deleteBtn.classList.add("deleting");
        deleteBtn.textContent = "Deleting...";

        setTimeout(() => {
            vehicles = vehicles.filter(v => v.vehicleNumber !== vehicle.vehicleNumber);
            saveToLocalStorage("vehicles", vehicles);
            deleteBtn.classList.remove("deleting");
            deleteBtn.textContent = "Delete";
            hideModal(carDetailsModal);
            renderVehicleList();
            showSuccess("Vehicle deleted successfully");
        }, 1000);
    };

    const handleExempt = (vehicleNumber) => {
        if (exemptVehicles.includes(vehicleNumber)) {
            exemptVehicles = exemptVehicles.filter(v => v !== vehicleNumber);
        } else {
            exemptVehicles.push(vehicleNumber);
        }
        saveToLocalStorage("exemptVehicles", exemptVehicles);
        renderVehicleList();
        renderExemptList();
    };

    // Rendering Functions
    const renderVehicleList = () => {
        carList.innerHTML = "";
        const filteredVehicles = filterVehicles();
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const paginatedVehicles = filteredVehicles.slice(startIndex, endIndex);

        paginatedVehicles.forEach(vehicle => {
            const li = document.createElement("li");
            li.className = "list-item";

            const vehicleInfo = document.createElement("div");
            vehicleInfo.className = "vehicle-info";

            const numberSpan = document.createElement("span");
            numberSpan.textContent = vehicle.vehicleNumber;
            numberSpan.className = "vehicle-number";

            const dateSpan = document.createElement("span");
            dateSpan.textContent = vehicle.date;
            dateSpan.className = "vehicle-date";

            vehicleInfo.appendChild(numberSpan);
            vehicleInfo.appendChild(dateSpan);

            if (exemptVehicles.includes(vehicle.vehicleNumber)) {
                const exemptTag = document.createElement("span");
                exemptTag.className = "exempt-tag";
                exemptTag.textContent = "EXEMPT";
                vehicleInfo.appendChild(exemptTag);
            }

            const actionsDiv = document.createElement("div");
            actionsDiv.className = "vehicle-actions";

            li.appendChild(vehicleInfo);
            li.appendChild(actionsDiv);

            li.addEventListener("click", () => {
                selectedVehicle = vehicle;
                currentAction = "viewDetails";
                showModal(authModal);
            });

            carList.appendChild(li);
        });

        renderPaginationControls(filteredVehicles.length);
    };

    const renderPaginationControls = (totalItems) => {
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        paginationControls.innerHTML = "";

        if (totalPages > 1) {
            // Previous button
            const prevBtn = document.createElement("button");
            prevBtn.className = "pagination-btn";
            prevBtn.textContent = "←";
            prevBtn.disabled = currentPage === 1;
            prevBtn.addEventListener("click", () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderVehicleList();
                }
            });
            paginationControls.appendChild(prevBtn);

            // Page numbers
            for (let i = 1; i <= totalPages; i++) {
                const pageBtn = document.createElement("button");
                pageBtn.className = `pagination-btn ${currentPage === i ? 'active' : ''}`;
                pageBtn.textContent = i;
                pageBtn.addEventListener("click", () => {
                    currentPage = i;
                    renderVehicleList();
                });
                paginationControls.appendChild(pageBtn);
            }

            // Next button
            const nextBtn = document.createElement("button");
            nextBtn.className = "pagination-btn";
            nextBtn.textContent = "→";
            nextBtn.disabled = currentPage === totalPages;
            nextBtn.addEventListener("click", () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    renderVehicleList();
                }
            });
            paginationControls.appendChild(nextBtn);
        }
    };

    const showVehicleDetails = (vehicle) => {
        modalVehicleNumber.textContent = vehicle.vehicleNumber;
        const isExempt = exemptVehicles.includes(vehicle.vehicleNumber);

        modalCarDetails.innerHTML = `
            <div class="detail-row">
                <label>Type:</label>
                <span>${vehicle.vehicleType}</span>
            </div>
            <div class="detail-row">
                <label>Owner:</label>
                <span>${vehicle.ownerName || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <label>Model:</label>
                <span>${vehicle.carModel || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <label>Contact:</label>
                <span>${vehicle.contactNumber || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <label>Notes:</label>
                <span>${vehicle.additionalNotes || 'N/A'}</span>
            </div>
            <div class="detail-row">
                <label>Date:</label>
                <span>${vehicle.date}</span>
            </div>
            ${isExempt ? '<div class="exempt-status">EXEMPT VEHICLE</div>' : ''}
        `;

        const exemptBtn = document.createElement("button");
        exemptBtn.className = `exempt-btn ${isExempt ? 'active' : ''}`;
        exemptBtn.textContent = isExempt ? 'Remove Exempt Status' : 'Mark as Exempt';
        exemptBtn.addEventListener("click", () => handleExempt(vehicle.vehicleNumber));
        modalCarDetails.appendChild(exemptBtn);

        showModal(carDetailsModal);
    };

    // Authentication Functions
        const authenticate = () => {
            const enteredPasscode = passcodeInput.value;
            if (enteredPasscode === PASSCODE) {
                hideModal(authModal);
                authMessage.style.display = "none";
                passcodeInput.value = "";

                switch (currentAction) {
                    case "viewDetails":
                        showVehicleDetails(selectedVehicle);
                        break;
                    case "clearAll":
                        clearAllVehicles();
                        break;
                    case "manageExempt":
                        showModal(document.getElementById("exemptModal"));
                        break;
                    default:
                        break;
                }
            } else {
                authMessage.style.display = "block";
                authMessage.classList.add("shake");
                setTimeout(() => authMessage.classList.remove("shake"), 500);
            }
        };

        // Export Functions
        const exportData = (format) => {
            const filteredVehicles = filterVehicles();

            switch(format) {
                case 'txt':
                    exportAsTXT(filteredVehicles);
                    break;
                case 'pdf':
                    exportAsPDF(filteredVehicles);
                    break;
                case 'excel':
                    exportAsExcel(filteredVehicles);
                    break;
            }
        };

        const exportAsTXT = (data) => {
            const text = data.map(vehicle => {
                return `Vehicle Number: ${vehicle.vehicleNumber}
    Type: ${vehicle.vehicleType}
    Owner: ${vehicle.ownerName || 'N/A'}
    Model: ${vehicle.carModel || 'N/A'}
    Contact: ${vehicle.contactNumber || 'N/A'}
    Notes: ${vehicle.additionalNotes || 'N/A'}
    Date: ${vehicle.date}
    Status: ${exemptVehicles.includes(vehicle.vehicleNumber) ? 'EXEMPT' : 'REGULAR'}
    ----------------------------------------`;
            }).join('\n\n');

            downloadFile(text, 'vehicles.txt', 'text/plain');
        };

        const exportAsPDF = (data) => {
            // PDF export functionality to be implemented
            alert('PDF export will be available soon!');
        };

        const exportAsExcel = (data) => {
            // Excel export functionality to be implemented
            alert('Excel export will be available soon!');
        };

        const downloadFile = (content, fileName, contentType) => {
            const blob = new Blob([content], { type: contentType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };

        // Report Functions
        const generateReport = () => {
            const reportCarList = document.getElementById("reportCarList");
            reportCarList.innerHTML = "";

            const filteredVehicles = filterVehicles();
            const dateRange = document.getElementById("reportDateRange");
            dateRange.textContent = `${document.getElementById("startDate").value} to ${document.getElementById("endDate").value}`;

            if (filteredVehicles.length === 0) {
                reportCarList.innerHTML = '<li class="no-results">No vehicles found for the selected criteria</li>';
            } else {
                filteredVehicles.forEach(vehicle => {
                    const li = document.createElement("li");
                    li.className = "report-item";
                    li.innerHTML = `
                        <div class="vehicle-info">
                            <span class="vehicle-number">${vehicle.vehicleNumber}</span>
                            <span class="vehicle-date">${vehicle.date}</span>
                            ${exemptVehicles.includes(vehicle.vehicleNumber) ? 
                                '<span class="exempt-tag">EXEMPT</span>' : ''}
                        </div>
                    `;
                    li.addEventListener("click", () => {
                        selectedVehicle = vehicle;
                        currentAction = "viewDetails";
                        showModal(authModal);
                    });
                    reportCarList.appendChild(li);
                });
            }

            showModal(reportModal);
        };

        // Event Listeners
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => {
                    if (modal.classList.contains('show')) {
                        hideModal(modal);
                    }
                });
            }
        });

        carForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const formData = new FormData(carForm);
            const vehicleData = Object.fromEntries(formData.entries());

            // Basic validation
            if (!vehicleData.vehicleNumber.trim() || !vehicleData.vehicleType) {
                showSuccess("Please fill in all required fields", 3000);
                return;
            }

            // Check for duplicate vehicle numbers
            if (vehicles.some(v => v.vehicleNumber === vehicleData.vehicleNumber)) {
                showSuccess("This vehicle number is already registered", 3000);
                return;
            }

            addVehicle(vehicleData);
            carForm.reset();
        });

        clearAllBtn.addEventListener("click", () => {
            currentAction = "clearAll";
            showModal(authModal);
        });

    // Export button listeners
        exportButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                const format = btn.id.replace('export', '').toLowerCase();
                exportData(format);
            });
        });

        // Navigation listeners
        navButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                switchSection(btn.dataset.section);
            });
        });

        // Report button listeners
        viewReportBtn.addEventListener("click", () => {
            const startDate = document.getElementById("startDate").value;
            const endDate = document.getElementById("endDate").value;

            if (!startDate || !endDate) {
                showSuccess("Please select both start and end dates", 3000);
                return;
            }

            if (new Date(startDate) > new Date(endDate)) {
                showSuccess("Start date cannot be after end date", 3000);
                return;
            }

            generateReport();
        });

        todayReportBtn.addEventListener("click", () => {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById("startDate").value = today;
            document.getElementById("endDate").value = today;
            generateReport();
        });

        // Modal close button listeners
        closeButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                const modal = btn.closest('.modal');
                hideModal(modal);
            });
        });

        // Authentication listeners
        submitPasscodeBtn.addEventListener("click", authenticate);
        passcodeInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                authenticate();
            }
        });

        // Delete button listener
        deleteModalBtn.addEventListener("click", () => {
            if (selectedVehicle) {
                deleteVehicle(selectedVehicle);
            }
        });

        // Filter change listener
        filterType.addEventListener("change", () => {
            currentPage = 1;
            renderVehicleList();
        });

        // Exempt management listeners
        document.getElementById("addExemptBtn")?.addEventListener("click", () => {
            const vehicleNumber = document.getElementById("exemptVehicleNumber").value;
            if (vehicleNumber) {
                if (!vehicles.some(v => v.vehicleNumber === vehicleNumber)) {
                    showSuccess("Vehicle not found in records", 3000);
                    return;
                }
                handleExempt(vehicleNumber);
                document.getElementById("exemptVehicleNumber").value = "";
                showSuccess("Exempt status updated successfully", 3000);
            }
        });

        // Click outside modal to close
        window.addEventListener("click", (e) => {
            document.querySelectorAll('.modal').forEach(modal => {
                if (e.target === modal) {
                    hideModal(modal);
                }
            });
        });

        // Handle window resize for responsive layout
        let resizeTimer;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                renderVehicleList();
            }, 250);
        });

        // Clear form fields function
        const clearForm = () => {
            carForm.reset();
            showSuccess("Form cleared", 1500);
        };

        // Error handler function
        const handleError = (error) => {
            console.error("Error:", error);
            showSuccess("An error occurred. Please try again.", 3000);
        };

        // Initialize tooltips
        const initTooltips = () => {
            const tooltips = document.querySelectorAll('[data-tooltip]');
            tooltips.forEach(element => {
                element.addEventListener('mouseenter', (e) => {
                    const tooltip = document.createElement('div');
                    tooltip.className = 'tooltip';
                    tooltip.textContent = e.target.dataset.tooltip;
                    document.body.appendChild(tooltip);

                    const rect = e.target.getBoundingClientRect();
                    tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
                    tooltip.style.left = `${rect.left + (rect.width/2) - (tooltip.offsetWidth/2)}px`;
                });

                element.addEventListener('mouseleave', () => {
                    const tooltip = document.querySelector('.tooltip');
                    if (tooltip) {
                        tooltip.remove();
                    }
                });
            });
        };

        // Date formatter for consistency
        const formatInputDate = (date) => {
            return date.toISOString().split('T')[0];
        };

        // Set default dates for reports
        const setDefaultDates = () => {
            const today = new Date();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(today.getDate() - 30);

            document.getElementById("startDate").value = formatInputDate(thirtyDaysAgo);
            document.getElementById("endDate").value = formatInputDate(today);
        };

        // Initialize application
        const init = () => {
            try {
                renderVehicleList();
                setDefaultDates();
                initTooltips();

                // Show welcome message on first visit
                if (!localStorage.getItem("hasVisited")) {
                    showSuccess("Welcome to Vehicle Registration System!", 3000);
                    localStorage.setItem("hasVisited", "true");
                }
            } catch (error) {
                handleError(error);
            }
        };

        // Initialize the application
        init();
    });
