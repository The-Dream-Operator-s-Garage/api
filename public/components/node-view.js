/**
 * NODE VIEW Component
 * Handles the display and interaction of the NODE VIEW section
 */

class NodeView {
    constructor(containerId = 'nodeViewContainer') {
        this.container = document.getElementById(containerId);
        this.panel = this.container?.closest('.node-view-panel') || this.container?.parentElement || null;
        this.pathBar = this.container?.querySelector('.node-view-path-bar');
        this.pathDisplay = this.container?.querySelector('.path-content');
        this.displayBox = this.container?.querySelector('.node-view-display-box');
        this.jsonElement = this.container?.querySelector('.node-view-json');
        this.scrollContainer = this.jsonElement;
        this.moreMenu = this.container?.querySelector('.node-view-more-menu');
        this.scrollHandle = this.container?.querySelector('.node-view-scroll-handle');
        
        // Title elements
        this.titleElement = this.container?.querySelector('.node-view-title');
        this.titleIcon = this.container?.querySelector('.node-view-title-icon');
        this.pathIcon = this.container?.querySelector('.path-icon');
        this.outerContainer = this.panel?.parentElement || this.container?.parentElement || null;
        
        // Buttons
        this.refreshBtn = this.container?.querySelector('.path-btn-refresh');
        this.copyBtn = this.container?.querySelector('.path-btn-copy');
        this.pinBtn = this.container?.querySelector('.path-btn-pin');
        this.saveBtn = this.container?.querySelector('.path-btn-save');
        this.moreBtn = this.container?.querySelector('.path-btn-more');
        
        // More menu buttons
        this.exportBtn = this.container?.querySelector('.more-menu-item[data-action="export"]');
        this.moreRefreshBtn = this.container?.querySelector('.more-menu-item[data-action="refresh"]');
        this.settingsBtn = this.container?.querySelector('.more-menu-item[data-action="settings"]');
        
        // State
        this.currentPath = '';
        this.currentData = null;
        this.currentType = 'path'; // 'entity' or 'path'
        this.isPinned = false;
        this.isSaved = false;
        this.isDraggingScrollHandle = false;
        this.dragStartY = 0;
        this.dragStartScrollTop = 0;
        this.scrollHandleHeight = 0;
        
        this.init();
    }
    
    init() {
        if (!this.container) {
            console.error('NodeView: Container not found');
            return;
        }
        
        // Attach event listeners
        this.attachEventListeners();
        this.attachScrollHandleEvents();
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.moreBtn?.contains(e.target) && !this.moreMenu?.contains(e.target)) {
                this.hideMoreMenu();
            }
        });
    }
    
    attachEventListeners() {
        // Copy button
        this.copyBtn?.addEventListener('click', () => this.copyPath());
        
        // Pin button
        this.pinBtn?.addEventListener('click', () => this.togglePin());
        
        // Save button
        this.saveBtn?.addEventListener('click', () => this.saveData());
        
        // More button
        this.moreBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMoreMenu();
        });
        
        // More menu items
        this.exportBtn?.addEventListener('click', () => this.exportJSON());
        this.refreshBtn?.addEventListener('click', () => this.refreshEntityFromDb());
        this.moreRefreshBtn?.addEventListener('click', () => this.refreshEntityFromDb());
        this.settingsBtn?.addEventListener('click', () => this.showSettings());
    }

    attachScrollHandleEvents() {
        if (!this.scrollContainer) return;

        this.scrollContainer.addEventListener('scroll', () => this.updateScrollHandle());
        window.addEventListener('resize', () => this.updateScrollHandle());

        if (!this.scrollHandle) return;

        this.scrollHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.isDraggingScrollHandle = true;
            this.dragStartY = e.clientY;
            this.dragStartScrollTop = this.scrollContainer.scrollTop;
            this.scrollHandle.classList.add('dragging');
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDraggingScrollHandle || !this.scrollContainer) return;

            const scrollableHeight = this.scrollContainer.scrollHeight - this.scrollContainer.clientHeight;
            const handleTravel = this.scrollContainer.clientHeight - this.scrollHandleHeight;
            if (scrollableHeight <= 0 || handleTravel <= 0) return;

            const deltaY = e.clientY - this.dragStartY;
            const scrollDelta = (deltaY / handleTravel) * scrollableHeight;
            this.scrollContainer.scrollTop = this.dragStartScrollTop + scrollDelta;
        });

        document.addEventListener('mouseup', () => {
            if (!this.isDraggingScrollHandle) return;
            this.isDraggingScrollHandle = false;
            this.scrollHandle?.classList.remove('dragging');
        });
    }
    
    /**
     * Show the NODE VIEW with data
     * @param {Object} data - User/entity data to display
     * @param {string} path - PathChain path to display
     */
    show(data, path = '') {
        if (!this.container) {
            console.warn('NodeView: Container not found, component may not be loaded yet');
            return;
        }
        
        this.currentData = data;
        this.currentPath = path || this.generatePathFromData(data);
        
        // Detect if this is an entity or a path
        this.detectType(data);
        
        // Update title and icons based on type
        this.updateTitleAndIcons();

        // Apply outer gradient background
        this.outerContainer?.classList.add('node-view-outer-gradient');
        
        // Update path display
        this.setPath(this.currentPath);
        
        // Format and display JSON
        this.displayJSON(data);
        this.updateScrollHandle();
        
        // Show panel (which contains the container)
        if (this.panel) {
            this.panel.style.display = 'flex';
        } else {
            this.container.style.display = 'flex';
        }
        
        // Scroll to top
        if (this.scrollContainer) {
            this.scrollContainer.scrollTo(0, 0);
        }
    }
    
    /**
     * Detect the type of data (entity or path)
     * @param {Object} data - Data to analyze
     */
    detectType(data) {
        // Check if data has entity structure
        if (data?.entity?.path || data?.path?.startsWith('entities/')) {
            this.currentType = 'entity';
        } else if (data?.entity || (data?.id && data?.path)) {
            this.currentType = 'entity';
        } else {
            this.currentType = 'path';
        }
    }
    
    /**
     * Update title and icons based on current type
     */
    updateTitleAndIcons() {
        if (this.currentType === 'entity') {
            // For entities, show the entity path as title
            const entityPath = this.getEntityPath();
            if (this.titleElement) {
                this.titleElement.textContent = entityPath || 'ENTITY';
            }
            
            // Use entity icon
            if (this.titleIcon) {
                this.titleIcon.textContent = 'account_circle'; // Material icon for entity/user
            }
            if (this.pathIcon) {
                this.pathIcon.textContent = 'account_circle';
            }
        } else {
            // For paths, show "NODE VIEW" or path
            if (this.titleElement) {
                this.titleElement.textContent = 'NODE VIEW';
            }
            
            // Use route icon
            if (this.titleIcon) {
                this.titleIcon.textContent = 'route'; // Material icon for path/route
            }
            if (this.pathIcon) {
                this.pathIcon.textContent = 'route';
            }
        }
    }
    
    /**
     * Get entity path from data
     * @returns {string} Entity path
     */
    getEntityPath() {
        if (this.currentData?.entity?.path) {
            return this.currentData.entity.path;
        }
        if (this.currentData?.path) {
            return this.currentData.path;
        }
        return this.currentPath ? `entities/${this.currentPath}` : '';
    }
    
    /**
     * Hide the NODE VIEW
     */
    hide() {
        if (this.panel) {
            this.panel.style.display = 'none';
        } else if (this.container) {
            this.container.style.display = 'none';
        }
        this.outerContainer?.classList.remove('node-view-outer-gradient');
        this.hideMoreMenu();
    }
    
    /**
     * Set the path to display
     * @param {string} path - PathChain path
     */
    setPath(path) {
        this.currentPath = path;
        if (this.pathDisplay) {
            // Truncate if too long
            const maxLength = 60;
            if (path.length > maxLength) {
                this.pathDisplay.textContent = path.substring(0, maxLength) + '...';
                this.pathDisplay.title = path; // Full path on hover
            } else {
                this.pathDisplay.textContent = path;
                this.pathDisplay.title = '';
            }
        }
    }
    
    /**
     * Generate a path from data if not provided
     * @param {Object} data - Entity data
     * @returns {string} Generated path
     */
    generatePathFromData(data) {
        if (data?.entity?.path) {
            return data.entity.path.replace(/^entities\//, '');
        }
        if (data?.path) {
            return data.path.replace(/^entities\//, '');
        }
        return 'NODE/' + Date.now().toString(16).toUpperCase();
    }
    
    /**
     * Display formatted JSON with hierarchical shadows
     * @param {Object} data - Data to display
     */
    displayJSON(data) {
        if (!this.jsonElement) return;
        
        // Use the formatJSONAdvanced function from main script
        if (typeof window.formatJSONAdvanced === 'function') {
            let formatted = window.formatJSONAdvanced(data);
            
            // Add hierarchical shadow classes based on indentation
            formatted = this.addHierarchicalShadows(formatted);
            
            this.jsonElement.innerHTML = formatted;
            this.updateScrollHandle();
        } else {
            // Fallback to plain JSON
            this.jsonElement.textContent = JSON.stringify(data, null, 2);
            this.updateScrollHandle();
        }
    }

    /**
     * Update scroll handle size and position
     */
    updateScrollHandle() {
        if (!this.scrollContainer || !this.scrollHandle) return;

        const { scrollHeight, clientHeight, scrollTop } = this.scrollContainer;
        const isOverflowing = scrollHeight > clientHeight + 1;

        if (!isOverflowing) {
            this.scrollHandle.style.display = 'none';
            return;
        }

        this.scrollHandle.style.display = 'block';
        const handleHeight = Math.max(32, Math.round((clientHeight * clientHeight) / scrollHeight));
        this.scrollHandleHeight = handleHeight;
        this.scrollHandle.style.height = `${handleHeight}px`;

        const maxScrollTop = scrollHeight - clientHeight;
        const maxHandleTop = clientHeight - handleHeight;
        const handleTop = maxScrollTop > 0 ? (scrollTop / maxScrollTop) * maxHandleTop : 0;
        this.scrollHandle.style.top = `${handleTop}px`;
    }
    
    /**
     * Add hierarchical shadow classes to JSON based on indentation
     * @param {string} html - Formatted JSON HTML
     * @returns {string} HTML with shadow classes
     */
    addHierarchicalShadows(html) {
        // Split by lines but preserve HTML structure
        const lines = html.split('\n');
        const result = [];
        
        for (const line of lines) {
            // Count leading spaces/tabs to determine level
            const leadingMatch = line.match(/^(\s*)/);
            const leadingSpaces = leadingMatch ? leadingMatch[1].length : 0;
            const level = Math.floor(leadingSpaces / 2); // Assuming 2 spaces per level
            const levelClass = `json-level-${Math.min(level, 8)}`; // Cap at level 8
            
            // Wrap line in span with level class if it has content
            if (line.trim()) {
                // Preserve existing HTML structure while adding level class
                result.push(`<div class="${levelClass}">${line}</div>`);
            } else {
                result.push(line);
            }
        }
        
        return result.join('\n');
    }
    
    /**
     * Copy path to clipboard
     */
    async copyPath() {
        try {
            const fullPath = ':: PATHS/' + this.currentPath;
            await navigator.clipboard.writeText(fullPath);
            
            // Show feedback
            if (window.showNotification) {
                window.showNotification('Path copied to clipboard', 'success');
            }
            
            // Visual feedback
            const icon = this.copyBtn?.querySelector('.material-icons');
            if (icon) {
                const originalText = icon.textContent;
                icon.textContent = 'check';
                setTimeout(() => {
                    icon.textContent = originalText;
                }, 1000);
            }
        } catch (err) {
            console.error('Failed to copy path:', err);
            if (window.showNotification) {
                window.showNotification('Failed to copy path', 'error');
            }
        }
    }
    
    /**
     * Toggle pin state
     */
    togglePin() {
        this.isPinned = !this.isPinned;
        
        if (this.pinBtn) {
            if (this.isPinned) {
                this.pinBtn.classList.add('pinned');
            } else {
                this.pinBtn.classList.remove('pinned');
            }
        }
        
        // Store pinned state (could use localStorage)
        if (this.isPinned) {
            localStorage.setItem('nodeView_pinned', 'true');
            localStorage.setItem('nodeView_pinnedPath', this.currentPath);
        } else {
            localStorage.removeItem('nodeView_pinned');
            localStorage.removeItem('nodeView_pinnedPath');
        }
        
        if (window.showNotification) {
            window.showNotification(
                this.isPinned ? 'Path pinned' : 'Path unpinned',
                'success'
            );
        }
    }
    
    /**
     * Save data
     */
    saveData() {
        if (!this.currentData) return;
        
        try {
            const jsonStr = JSON.stringify(this.currentData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `node-view-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.isSaved = true;
            if (this.saveBtn) {
                this.saveBtn.classList.add('saved');
                setTimeout(() => {
                    this.saveBtn.classList.remove('saved');
                    this.isSaved = false;
                }, 2000);
            }
            
            if (window.showNotification) {
                window.showNotification('Data saved successfully', 'success');
            }
        } catch (err) {
            console.error('Failed to save data:', err);
            if (window.showNotification) {
                window.showNotification('Failed to save data', 'error');
            }
        }
    }
    
    /**
     * Toggle more menu
     */
    toggleMoreMenu() {
        if (!this.moreMenu) return;
        
        const isVisible = this.moreMenu.style.display !== 'none';
        this.moreMenu.style.display = isVisible ? 'none' : 'block';
    }
    
    /**
     * Hide more menu
     */
    hideMoreMenu() {
        if (this.moreMenu) {
            this.moreMenu.style.display = 'none';
        }
    }
    
    /**
     * Export JSON
     */
    exportJSON() {
        this.saveData(); // Same functionality
        this.hideMoreMenu();
    }
    
    /**
     * Refresh data
     */
    async refreshData() {
        this.hideMoreMenu();
        
        // Trigger refresh event
        const event = new CustomEvent('nodeViewRefresh', {
            detail: { path: this.currentPath }
        });
        document.dispatchEvent(event);
        
        if (window.showNotification) {
            window.showNotification('Refreshing data...', 'success');
        }
    }

    refreshEntityFromDb() {
        this.hideMoreMenu();
        if (typeof window.refreshNodeViewEntity === 'function') {
            window.refreshNodeViewEntity(this.container?.id);
        } else {
            console.warn('NodeView: refreshNodeViewEntity is not available');
        }
    }
    
    /**
     * Show settings
     */
    showSettings() {
        this.hideMoreMenu();
        
        // Trigger settings event
        const event = new CustomEvent('nodeViewSettings', {
            detail: {}
        });
        document.dispatchEvent(event);
        
        if (window.showNotification) {
            window.showNotification('Settings coming soon', 'success');
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NodeView;
}

// Make available globally
window.NodeView = NodeView;
