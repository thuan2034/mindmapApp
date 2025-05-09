document.addEventListener("DOMContentLoaded", () => {
  // ===== DOM Elements =====
  const mindMapContainer = document.getElementById("mindMapContainer");
  const nodeInputArea = document.getElementById("node-input-area");
  const fileViewerArea = document.getElementById("file-viewer-area");
  const linkInputArea = document.getElementById("link-input-area");
  const linkUrlInput = document.getElementById("link-url-input");
  const linkDescriptionInput = document.getElementById("link-description-input");
  const addLinkButton = document.getElementById("addLinkButton");
  const saveBtn = document.querySelector(".save-btn");
  const editorTitle = document.querySelector(".editor-pane h2");
  const addNodeButton = document.getElementById("addNodeButton");
  const editorToolbar = document.querySelector(".editor-toolbar");
  const nodeFileInput = document.getElementById("nodeFileInput");
  const uploadFileToolbarButton = document.getElementById("uploadFileToolbarButton");
  const connectNodesButton = document.getElementById("connectNodesButton");
  const deleteNodeBtn = document.getElementById("deleteNodeBtn");
  const searchInput = document.querySelector(".search-container input");
  const zoomInBtn = document.getElementById("zoomInBtn");
  const zoomOutBtn = document.getElementById("zoomOutBtn");
  const resetZoomBtn = document.getElementById("resetZoomBtn");
  const minimapIndicator = document.querySelector(".minimap-indicator");
  const resizableDivider = document.querySelector(".resizable-divider");
  const editorPane = document.querySelector(".editor-pane");
  const switchToTextButton = document.getElementById("switchToTextButton");

  // ===== State Variables =====
  let isConnectionMode = false;
  let connectionSourceNodeId = null;
  let nodes = []; // Store node data (name, contentHtml, contentText, position, id, color, fileData, linkData)
  let selectedNodeId = null;
  let nodeIdCounter = 0;
  let isDragging = false;
  let activeDraggableNode = null;
  let dragOffsetX, dragOffsetY;
  let nodeClickPrevented = false;
  let svgLinesContainer = null;
  let currentZoom = 1;
  let isPanning = false;
  let panStartX, panStartY;
  let panOffsetX = 0;
  let panOffsetY = 0;
  let pendingChanges = null; // Store pending changes before save

  // ===== Resizable Divider Functionality =====
  let isResizing = false;
  let startX;
  let startWidth;

  function initResizableDivider() {
    const resizableDivider = document.querySelector(".resizable-divider");
    const editorPane = document.querySelector(".editor-pane");
    
    if (!resizableDivider || !editorPane) return;

    resizableDivider.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.pageX;
      startWidth = editorPane.offsetWidth;
      resizableDivider.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;

      const width = startWidth + (e.pageX - startX);
      const minWidth = 0;
      const maxWidth = 800;
      
      if (width >= minWidth && width <= maxWidth) {
        editorPane.style.width = `${width}px`;
      }
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        resizableDivider.classList.remove('dragging');
        document.body.style.cursor = '';
      }
    });

    // Prevent text selection while resizing
    resizableDivider.addEventListener('selectstart', (e) => {
      e.preventDefault();
    });
  }

  // Initialize resizable divider
  initResizableDivider();

  // ===== Utility Functions =====
  function escapeHTML(str) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function ensureSvgContainer() {
    if (!svgLinesContainer) {
      svgLinesContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svgLinesContainer.style.position = "absolute";
      svgLinesContainer.style.top = "0";
      svgLinesContainer.style.left = "0";
      svgLinesContainer.style.width = "100%";
      svgLinesContainer.style.height = "100%";
      svgLinesContainer.style.pointerEvents = "none";
      mindMapContainer.insertBefore(svgLinesContainer, mindMapContainer.firstChild);
    }
    svgLinesContainer.setAttribute("width", mindMapContainer.scrollWidth);
    svgLinesContainer.setAttribute("height", mindMapContainer.scrollHeight);
  }

  // ===== Node Management Functions =====
  function createNodeElement(nodeData) {
    const nodeDiv = document.createElement("div");
    nodeDiv.classList.add("node");
    nodeDiv.id = nodeData.id;
    nodeDiv.style.left = nodeData.x + "px";
    nodeDiv.style.top = nodeData.y + "px";
    if (nodeData.color) {
      nodeDiv.style.backgroundColor = nodeData.color;
    }
    
    const displayText = nodeData.name || "Node";
    nodeDiv.innerHTML = escapeHTML(displayText);
    nodeDiv.dataset.contentHtml = nodeData.contentHtml;
    nodeDiv.dataset.contentText = nodeData.contentText;
    if (nodeData.fileData) {
      nodeDiv.dataset.fileData = JSON.stringify(nodeData.fileData);
    }
    if (nodeData.linkData) {
      nodeDiv.dataset.linkData = JSON.stringify(nodeData.linkData);
    }

    nodeDiv.addEventListener("mousedown", onNodeMouseDown);
    return nodeDiv;
  }

  function addNode(name = "New Node", x = 50, y = 50, color = "#FFFFE0", contentHtml = "", fileData = null, linkData = null) {
    nodeIdCounter++;
    const defaultHtml = contentHtml || name;
    const contentText = new DOMParser().parseFromString(defaultHtml, "text/html").body.textContent || "";
    
    const newNodeData = {
      id: `node-generated-${nodeIdCounter}`,
      name: name,
      contentHtml: defaultHtml,
      contentText: contentText,
      x: x,
      y: y,
      color: color,
      connections: [],
      fileData: fileData,
      linkData: linkData
    };
    
    nodes.push(newNodeData);
    const nodeElement = createNodeElement(newNodeData);
    mindMapContainer.appendChild(nodeElement);
    selectNode(newNodeData.id);
    return newNodeData;
  }

  function selectNode(nodeId) {
    if (nodeId === selectedNodeId && nodeInputArea.innerHTML !== "") return;
    
    // Clear any pending changes when selecting a new node
    pendingChanges = null;
    
    loadNodeInEditor(nodeId);
  }

  function loadNodeInEditor(nodeId) {
    const nodeData = nodes.find((n) => n.id === nodeId);
    if (nodeData) {
      selectedNodeId = nodeId;
      editorTitle.textContent = escapeHTML(nodeData.name) || "Edit Node";
      
      // Hide all content areas first
      nodeInputArea.style.display = "none";
      fileViewerArea.style.display = "none";
      linkInputArea.style.display = "none";
      uploadFileToolbarButton.style.display = "none";
      switchToTextButton.style.display = "none";
      
      if (nodeData.fileData) {
        fileViewerArea.style.display = "block";
        switchToTextButton.style.display = "inline-block";
        
        if (nodeData.fileData.type.startsWith('image/')) {
          fileViewerArea.innerHTML = `<img src="${nodeData.fileData.url}" alt="Uploaded image" style="max-width: 100%; max-height: 100%;">`;
        } else if (nodeData.fileData.type === 'application/pdf') {
          fileViewerArea.innerHTML = `<embed src="${nodeData.fileData.url}" type="application/pdf" width="100%" height="100%">`;
        } else if (nodeData.fileData.type.startsWith('video/')) {
          fileViewerArea.innerHTML = `
            <video controls style="max-width: 100%; max-height: 100%;">
              <source src="${nodeData.fileData.url}" type="${nodeData.fileData.type}">
              Your browser does not support the video tag.
            </video>`;
        } else if (nodeData.fileData.type.startsWith('audio/')) {
          fileViewerArea.innerHTML = `
            <audio controls style="width: 100%; margin: 20px 0;">
              <source src="${nodeData.fileData.url}" type="${nodeData.fileData.type}">
              Your browser does not support the audio tag.
            </audio>`;
        }
      } else if (nodeData.linkData) {
        linkInputArea.style.display = "block";
        switchToTextButton.style.display = "inline-block";
        linkUrlInput.value = nodeData.linkData.url;
        linkDescriptionInput.value = nodeData.linkData.description;
      } else {
        nodeInputArea.style.display = "block";
        uploadFileToolbarButton.style.display = "inline-block";
        nodeInputArea.innerHTML = nodeData.contentHtml;
      }
      
      updateNodeSelectionVisual();
    }
  }

  function updateNodeSelectionVisual() {
    document.querySelectorAll(".node").forEach((n) => n.classList.remove("selected-canvas"));
    if (selectedNodeId) {
      const nodeEl = document.getElementById(selectedNodeId);
      if (nodeEl) nodeEl.classList.add("selected-canvas");
    }
  }

  function deleteNode(nodeId) {
    // Remove the node from the DOM
    const nodeElement = document.getElementById(nodeId);
    if (nodeElement) {
      nodeElement.remove();
    }

    // Remove the node from the nodes array
    const nodeIndex = nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex !== -1) {
      // Remove all connections to this node from other nodes
      nodes.forEach(node => {
        if (node.connections) {
          node.connections = node.connections.filter(connId => connId !== nodeId);
        }
      });
      
      // Remove the node
      nodes.splice(nodeIndex, 1);
    }

    // If the deleted node was selected, clear the editor
    if (selectedNodeId === nodeId) {
      selectedNodeId = null;
      editorTitle.textContent = "New node";
      nodeInputArea.innerHTML = "";
      nodeInputArea.style.display = "block";
      fileViewerArea.style.display = "none";
      updateNodeSelectionVisual();
    }

    // Update connections display
    updateConnections();
  }

  // ===== Connection Management =====
  function drawLine(node1Id, node2Id) {
    const node1El = document.getElementById(node1Id);
    const node2El = document.getElementById(node2Id);
    if (!node1El || !node2El || !svgLinesContainer) return;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    const x1 = node1El.offsetLeft + node1El.offsetWidth / 2;
    const y1 = node1El.offsetTop + node1El.offsetHeight / 2;
    const x2 = node2El.offsetLeft + node2El.offsetWidth / 2;
    const y2 = node2El.offsetTop + node2El.offsetHeight / 2;

    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("class", "connector-line");
    line.dataset.from = node1Id;
    line.dataset.to = node2Id;

    svgLinesContainer.appendChild(line);
  }

  function updateConnections() {
    ensureSvgContainer();
    svgLinesContainer.innerHTML = "";
    nodes.forEach((node) => {
      if (node.connections) {
        node.connections.forEach((targetId) => {
          if (nodes.find((n) => n.id === targetId)) {
            drawLine(node.id, targetId);
          }
        });
      }
    });
  }

  // ===== Drag and Drop Handlers =====
  function onNodeMouseDown(e) {
    if (e.button !== 0) return;

    activeDraggableNode = e.target.closest(".node");
    if (!activeDraggableNode) return;

    isDragging = false;
    nodeClickPrevented = false;

    const rect = activeDraggableNode.getBoundingClientRect();
    const containerRect = mindMapContainer.getBoundingClientRect();
    
    // Calculate drag offset considering zoom, pan, and container position
    dragOffsetX = (e.clientX - containerRect.left) / currentZoom - panOffsetX - parseInt(activeDraggableNode.style.left);
    dragOffsetY = (e.clientY - containerRect.top) / currentZoom - panOffsetY - parseInt(activeDraggableNode.style.top);

    activeDraggableNode.classList.add("dragging");
    activeDraggableNode.style.zIndex = 1000;

    document.addEventListener("mousemove", onNodeMouseMove);
    document.addEventListener("mouseup", onNodeMouseUp);
  }

  function onNodeMouseMove(e) {
    if (!activeDraggableNode) return;

    if (!isDragging) {
      isDragging = true;
      nodeClickPrevented = true;
    }

    e.preventDefault();

    const containerRect = mindMapContainer.getBoundingClientRect();
    
    // Calculate new position considering zoom and pan
    let newX = (e.clientX - containerRect.left) / currentZoom - panOffsetX - dragOffsetX;
    let newY = (e.clientY - containerRect.top) / currentZoom - panOffsetY - dragOffsetY;

    const nodeWidth = activeDraggableNode.offsetWidth;
    const nodeHeight = activeDraggableNode.offsetHeight;
    
    // Allow nodes to be dragged anywhere within the large canvas
    newX = Math.max(0, Math.min(newX, mindMapContainer.offsetWidth - nodeWidth));
    newY = Math.max(0, Math.min(newY, mindMapContainer.offsetHeight - nodeHeight));

    activeDraggableNode.style.left = newX + "px";
    activeDraggableNode.style.top = newY + "px";

    const nodeData = nodes.find((n) => n.id === activeDraggableNode.id);
    if (nodeData) {
      nodeData.x = newX;
      nodeData.y = newY;
    }
    updateConnections();
  }

  function onNodeMouseUp(e) {
    if (activeDraggableNode) {
      if (!isDragging) {
        if (isConnectionMode) {
          if (!connectionSourceNodeId) {
            connectionSourceNodeId = activeDraggableNode.id;
            activeDraggableNode.classList.add("connection-source");
          } else {
            const targetNodeId = activeDraggableNode.id;
            const sourceNode = nodes.find((n) => n.id === connectionSourceNodeId);

            if (sourceNode && sourceNode.id !== targetNodeId) {
              if (!sourceNode.connections.includes(targetNodeId)) {
                sourceNode.connections.push(targetNodeId);
                updateConnections();
              }
            }

            document.querySelectorAll(".node.connection-source").forEach((n) => n.classList.remove("connection-source"));
            isConnectionMode = false;
            connectionSourceNodeId = null;
          }
        } else {
          selectNode(activeDraggableNode.id);
        }
      }
      activeDraggableNode.classList.remove("dragging");
      activeDraggableNode.style.zIndex = "";
    }

    isDragging = false;
    activeDraggableNode = null;
    document.removeEventListener("mousemove", onNodeMouseMove);
    document.removeEventListener("mouseup", onNodeMouseUp);
  }

  // ===== Event Listeners =====
  // Rich Text Editor
  if (editorToolbar) {
    editorToolbar.addEventListener("click", (e) => {
      const button = e.target.closest("button");
      if (button && button.dataset.command) {
        const command = button.dataset.command;
        const value = button.dataset.value || null;
        document.execCommand(command, false, value);
        nodeInputArea.focus();
      }
    });
  }

  // File Upload
  if (uploadFileToolbarButton) {
    uploadFileToolbarButton.addEventListener("click", () => {
      nodeFileInput.click();
    });
  }

  if (nodeFileInput) {
    nodeFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const fileUrl = URL.createObjectURL(file);
      const fileData = {
        name: file.name,
        type: file.type,
        size: file.size,
        url: fileUrl
      };

      // Add file type icon to node name
      let fileIcon = '';
      if (file.type.startsWith('image/')) {
        fileIcon = '<i class="fas fa-image"></i> ';
      } else if (file.type === 'application/pdf') {
        fileIcon = '<i class="fas fa-file-pdf"></i> ';
      } else if (file.type.startsWith('video/')) {
        fileIcon = '<i class="fas fa-video"></i> ';
      } else if (file.type.startsWith('audio/')) {
        fileIcon = '<i class="fas fa-music"></i> ';
      }

      if (selectedNodeId) {
        // Store pending changes instead of applying immediately
        pendingChanges = {
          type: 'file',
          fileData: fileData,
          fileIcon: fileIcon
        };

        // Show preview in editor
        nodeInputArea.style.display = "none";
        fileViewerArea.style.display = "block";
        uploadFileToolbarButton.style.display = "none";
        switchToTextButton.style.display = "inline-block";
        
        if (file.type.startsWith('image/')) {
          fileViewerArea.innerHTML = `<img src="${fileUrl}" alt="Uploaded image" style="max-width: 100%; max-height: 100%;">`;
        } else if (file.type === 'application/pdf') {
          fileViewerArea.innerHTML = `<embed src="${fileUrl}" type="application/pdf" width="100%" height="100%">`;
        } else if (file.type.startsWith('video/')) {
          fileViewerArea.innerHTML = `
            <video controls style="max-width: 100%; max-height: 100%;">
              <source src="${fileUrl}" type="${file.type}">
              Your browser does not support the video tag.
            </video>`;
        } else if (file.type.startsWith('audio/')) {
          fileViewerArea.innerHTML = `
            <audio controls style="width: 100%; margin: 20px 0;">
              <source src="${fileUrl}" type="${file.type}">
              Your browser does not support the audio tag.
            </audio>`;
        }
      } else {
        // For new nodes, place in center of viewport
        const canvasPane = document.querySelector('.canvas-pane');
        const paneRect = canvasPane.getBoundingClientRect();
        
        // Calculate the center of the visible area, taking into account zoom and pan
        const centerX = (-panOffsetX + paneRect.width / (2 * currentZoom));
        const centerY = (-panOffsetY + paneRect.height / (2 * currentZoom));
        
        // For new nodes, use a default name with file info
        const defaultName = "New Node";
        addNode(defaultName, centerX, centerY, "#FFFFE0", "", fileData);
        const newNodeEl = document.getElementById(`node-generated-${nodeIdCounter}`);
        if (newNodeEl) {
          newNodeEl.innerHTML = fileIcon + escapeHTML(defaultName);
        }
      }

      nodeFileInput.value = "";
    });
  }

  // Node Title Editing
  const editBtn = document.querySelector(".edit-btn");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      const titleElement = editorTitle;
      titleElement.contentEditable = true;
      titleElement.focus();
    });
  }

  // Switch to Text Button
  if (switchToTextButton) {
    switchToTextButton.addEventListener("click", () => {
      if (selectedNodeId) {
        // Store pending change to switch to text mode
        pendingChanges = {
          type: 'switchToText'
        };
        
        // Show text editor preview
        nodeInputArea.style.display = "block";
        fileViewerArea.style.display = "none";
        linkInputArea.style.display = "none"; // Explicitly hide link input area
        uploadFileToolbarButton.style.display = "inline-block";
        switchToTextButton.style.display = "none";
        nodeInputArea.innerHTML = "";
      }
    });
  }

  // Add Link Button
  if (addLinkButton) {
    addLinkButton.addEventListener("click", () => {
      if (selectedNodeId) {
        // Store pending change to switch to link mode
        pendingChanges = {
          type: 'switchToLink'
        };
        
        // Show link input preview
        nodeInputArea.style.display = "none";
        fileViewerArea.style.display = "none";
        linkInputArea.style.display = "block";
        uploadFileToolbarButton.style.display = "none";
        switchToTextButton.style.display = "inline-block";
        
        // Clear previous values
        linkUrlInput.value = "";
        linkDescriptionInput.value = "";
      } else {
        // For new nodes, place in center of viewport
        const canvasPane = document.querySelector('.canvas-pane');
        const paneRect = canvasPane.getBoundingClientRect();
        
        // Calculate the center of the visible area, taking into account zoom and pan
        const centerX = (-panOffsetX + paneRect.width / (2 * currentZoom));
        const centerY = (-panOffsetY + paneRect.height / (2 * currentZoom));
        
        // For new nodes, use a default name
        const defaultName = "New Link";
        addNode(defaultName, centerX, centerY, "#FFFFE0", "", null, { url: "", description: "" });
      }
    });
  }

  // Save Button
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      if (selectedNodeId) {
        const nodeData = nodes.find((n) => n.id === selectedNodeId);
        if (nodeData) {
          const newName = editorTitle.textContent.trim();
          
          if (pendingChanges) {
            if (pendingChanges.type === 'file') {
              // Apply pending file changes
              nodeData.fileData = pendingChanges.fileData;
              nodeData.linkData = null; // Clear link data
              nodeData.name = newName;
              const nodeEl = document.getElementById(selectedNodeId);
              if (nodeEl) {
                nodeEl.dataset.fileData = JSON.stringify(pendingChanges.fileData);
                nodeEl.removeAttribute('data-link-data');
                nodeEl.innerHTML = pendingChanges.fileIcon + escapeHTML(newName);
              }
            } else if (pendingChanges.type === 'switchToText') {
              // Apply switch to text changes
              nodeData.fileData = null;
              nodeData.linkData = null;
              nodeData.name = newName;
              const nodeEl = document.getElementById(selectedNodeId);
              if (nodeEl) {
                nodeEl.removeAttribute('data-file-data');
                nodeEl.removeAttribute('data-link-data');
                nodeEl.innerHTML = escapeHTML(newName);
              }
            } else if (pendingChanges.type === 'switchToLink') {
              // Apply switch to link changes
              nodeData.fileData = null;
              nodeData.linkData = {
                url: linkUrlInput.value.trim(),
                description: linkDescriptionInput.value.trim()
              };
              nodeData.name = newName;
              const nodeEl = document.getElementById(selectedNodeId);
              if (nodeEl) {
                nodeEl.removeAttribute('data-file-data');
                nodeEl.dataset.linkData = JSON.stringify(nodeData.linkData);
                nodeEl.innerHTML = `<i class="fas fa-link"></i> ${escapeHTML(newName)}`;
              }
            }
            pendingChanges = null;
          } else if (nodeData.linkData) {
            // Update link data
            nodeData.linkData.url = linkUrlInput.value.trim();
            nodeData.linkData.description = linkDescriptionInput.value.trim();
            nodeData.name = newName;
            const nodeEl = document.getElementById(selectedNodeId);
            if (nodeEl) {
              nodeEl.dataset.linkData = JSON.stringify(nodeData.linkData);
              nodeEl.innerHTML = `<i class="fas fa-link"></i> ${escapeHTML(newName)}`;
            }
          } else if (!nodeData.fileData) {
            // Apply text content changes
            const currentHtmlContent = nodeInputArea.innerHTML;
            const currentTextContent = nodeInputArea.textContent || nodeInputArea.innerText;
            
            // Update node data
            nodeData.contentHtml = currentHtmlContent;
            nodeData.contentText = currentTextContent;
            nodeData.name = newName;

            // Update node display
            const nodeElement = document.getElementById(selectedNodeId);
            if (nodeElement) {
              nodeElement.dataset.contentHtml = currentHtmlContent;
              nodeElement.dataset.contentText = currentTextContent;
              nodeElement.textContent = newName;
            }
          } else {
            // Update only the name for nodes with files
            nodeData.name = newName;
            const nodeEl = document.getElementById(selectedNodeId);
            if (nodeEl) {
              let fileIcon = '';
              if (nodeData.fileData.type.startsWith('image/')) {
                fileIcon = '<i class="fas fa-image"></i> ';
              } else if (nodeData.fileData.type === 'application/pdf') {
                fileIcon = '<i class="fas fa-file-pdf"></i> ';
              } else if (nodeData.fileData.type.startsWith('video/')) {
                fileIcon = '<i class="fas fa-video"></i> ';
              } else if (nodeData.fileData.type.startsWith('audio/')) {
                fileIcon = '<i class="fas fa-music"></i> ';
              }
              nodeEl.innerHTML = fileIcon + escapeHTML(newName);
            }
          }
        }
      } else {
        const currentTextContent = nodeInputArea.textContent || nodeInputArea.innerText;
        const currentHtmlContent = nodeInputArea.innerHTML;
        if (currentTextContent.trim() || currentHtmlContent.trim()) {
          addNode("New Node", 70, 70, "#FFFFE0", currentHtmlContent);
        }
      }
    });
  }

  // Add Node Button
  if (addNodeButton) {
    addNodeButton.addEventListener("click", () => {
      const canvasRect = mindMapContainer.getBoundingClientRect();
      const canvasPane = document.querySelector('.canvas-pane');
      const paneRect = canvasPane.getBoundingClientRect();
      
      // Calculate the center of the visible area, taking into account zoom and pan
      const centerX = (-panOffsetX + paneRect.width / (2 * currentZoom));
      const centerY = (-panOffsetY + paneRect.height / (2 * currentZoom));
      
      addNode(
        "New Canvas Node",
        centerX,
        centerY,
        "#FFFFE0",
        "",
        null
      );
      nodeInputArea.focus();
    });
  }

  // Connect Nodes Button
  if (connectNodesButton) {
    connectNodesButton.addEventListener("click", () => {
      isConnectionMode = true;
      connectionSourceNodeId = null;
    });
  }

  // Delete Node Button
  if (deleteNodeBtn) {
    deleteNodeBtn.addEventListener("click", () => {
      if (selectedNodeId) {
        if (confirm("Are you sure you want to delete this node?")) {
          deleteNode(selectedNodeId);
        }
      }
    });
  }

  // ===== Search Functionality =====
  let currentSearchResults = [];
  let currentSearchIndex = -1;

  function searchNodes(query) {
    // Remove previous search highlights
    document.querySelectorAll('.node.search-highlight').forEach(node => {
      node.classList.remove('search-highlight');
    });

    if (!query.trim()) {
      currentSearchResults = [];
      currentSearchIndex = -1;
      document.querySelector('.search-navigation').classList.remove('active');
      return;
    }

    currentSearchResults = nodes.filter(node => 
      node.name.toLowerCase().includes(query.toLowerCase())
    );

    // Highlight matching nodes
    currentSearchResults.forEach(node => {
      const nodeElement = document.getElementById(node.id);
      if (nodeElement) {
        nodeElement.classList.add('search-highlight');
      }
    });

    // Update navigation controls
    const searchNav = document.querySelector('.search-navigation');
    const resultCount = searchNav.querySelector('.result-count');
    const prevBtn = document.getElementById('prevResultBtn');
    const nextBtn = document.getElementById('nextResultBtn');

    if (currentSearchResults.length > 0) {
      searchNav.classList.add('active');
      currentSearchIndex = 0;
      resultCount.textContent = `1/${currentSearchResults.length}`;
      prevBtn.disabled = true;
      nextBtn.disabled = currentSearchResults.length === 1;
      centerOnNode(currentSearchResults[0]);
    } else {
      searchNav.classList.remove('active');
      currentSearchIndex = -1;
    }

    return currentSearchResults;
  }

  function centerOnNode(node) {
    const nodeElement = document.getElementById(node.id);
    if (nodeElement) {
      selectNode(node.id);
      
      const canvasPane = document.querySelector('.canvas-pane');
      const paneRect = canvasPane.getBoundingClientRect();
      
      // Calculate the center position of the node
      const nodeCenterX = node.x + (nodeElement.offsetWidth / 2);
      const nodeCenterY = node.y + (nodeElement.offsetHeight / 2);
      
      // Calculate the pan offset needed to center the node in the viewport
      panOffsetX = (paneRect.width / (2 * currentZoom)) - nodeCenterX;
      panOffsetY = (paneRect.height / (2 * currentZoom)) - nodeCenterY;
      
      // Apply the transform
      mindMapContainer.style.transform = `scale(${currentZoom}) translate(${panOffsetX}px, ${panOffsetY}px)`;
      updateMinimap();
    }
  }

  function navigateSearchResults(direction) {
    if (currentSearchResults.length === 0) return;

    const prevBtn = document.getElementById('prevResultBtn');
    const nextBtn = document.getElementById('nextResultBtn');
    const resultCount = document.querySelector('.result-count');

    currentSearchIndex = (currentSearchIndex + direction + currentSearchResults.length) % currentSearchResults.length;
    resultCount.textContent = `${currentSearchIndex + 1}/${currentSearchResults.length}`;
    
    // Update button states
    prevBtn.disabled = currentSearchIndex === 0;
    nextBtn.disabled = currentSearchIndex === currentSearchResults.length - 1;

    // Center on the selected node
    centerOnNode(currentSearchResults[currentSearchIndex]);
  }

  // Search Input
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const query = e.target.value.trim();
        searchNodes(query);
      }, 300);
    });

    // Clear search on escape
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        document.querySelectorAll('.node.search-highlight').forEach(node => {
          node.classList.remove('search-highlight');
        });
        document.querySelector('.search-navigation').classList.remove('active');
        currentSearchResults = [];
        currentSearchIndex = -1;
      }
    });
  }

  // Search Navigation Buttons
  const prevResultBtn = document.getElementById('prevResultBtn');
  const nextResultBtn = document.getElementById('nextResultBtn');

  if (prevResultBtn) {
    prevResultBtn.addEventListener('click', () => navigateSearchResults(-1));
  }

  if (nextResultBtn) {
    nextResultBtn.addEventListener('click', () => navigateSearchResults(1));
  }

  // Keyboard navigation for search results
  document.addEventListener('keydown', (e) => {
    if (currentSearchResults.length > 0) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateSearchResults(-1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateSearchResults(1);
      }
    }
  });

  // ===== Initialization =====
  function initializeStaticNodes() {
    const staticNodeElements = mindMapContainer.querySelectorAll('.node:not([id^="node-generated-"])');
    let maxIdNum = 0;

    // Calculate center of the canvas
    const centerX = mindMapContainer.offsetWidth / 2;
    const centerY = mindMapContainer.offsetHeight / 2;

    staticNodeElements.forEach((nodeEl) => {
      if (nodes.find((n) => n.id === nodeEl.id)) return;

      const idParts = nodeEl.id.split("-");
      const numPart = parseInt(idParts[idParts.length - 1], 10);
      if (!isNaN(numPart)) maxIdNum = Math.max(maxIdNum, numPart);

      const nameText = nodeEl.textContent.trim();
      const initialColor = nodeEl.style.backgroundColor || "#FFFFE0";
      
      // Calculate position relative to center
      let x, y;
      if (nodeEl.id === "node-lap-trinh-web") {
        x = centerX;
        y = centerY;
      } else if (nodeEl.id === "node-oop") {
        x = centerX - 200;
        y = centerY - 100;
      } else if (nodeEl.id === "node-csdl") {
        x = centerX + 200;
        y = centerY - 100;
      } else if (nodeEl.id === "node-new") {
        x = centerX - 200;
        y = centerY + 100;
      } else if (nodeEl.id === "node-uiux") {
        x = centerX + 200;
        y = centerY + 100;
      }

      const newNodeData = {
        id: nodeEl.id,
        name: nameText,
        contentHtml: escapeHTML(nameText),
        contentText: nameText,
        x: x,
        y: y,
        color: initialColor,
        connections: [],
      };
      nodes.push(newNodeData);
      nodeEl.dataset.contentHtml = newNodeData.contentHtml;
      nodeEl.dataset.contentText = newNodeData.contentText;
      nodeEl.style.left = x + "px";
      nodeEl.style.top = y + "px";
      nodeEl.addEventListener("mousedown", onNodeMouseDown);
    });

    nodeIdCounter = Math.max(nodeIdCounter, maxIdNum);

    const lapTrinhWebNode = nodes.find((n) => n.id === "node-lap-trinh-web");
    if (lapTrinhWebNode) {
      lapTrinhWebNode.connections = ["node-oop", "node-csdl", "node-new", "node-uiux"];
    }

    if (nodes.length === 0) {
      editorTitle.textContent = "New node";
      nodeInputArea.innerHTML = "";
      nodeInputArea.setAttribute("placeholder", "Nhập nội dung...");
      selectedNodeId = null;
    }
    updateNodeSelectionVisual();
  }

  // Function to center the view on the canvas
  function centerView() {
    const canvasPane = document.querySelector('.canvas-pane');
    const paneRect = canvasPane.getBoundingClientRect();
    
    // Calculate the center of the canvas
    const centerX = mindMapContainer.offsetWidth / 2;
    const centerY = mindMapContainer.offsetHeight / 2;
    
    // Calculate the pan offset needed to center the view
    panOffsetX = (paneRect.width / (2 * currentZoom)) - centerX;
    panOffsetY = (paneRect.height / (2 * currentZoom)) - centerY;
    
    // Apply the transform
    mindMapContainer.style.transform = `scale(${currentZoom}) translate(${panOffsetX}px, ${panOffsetY}px)`;
    updateMinimap();
  }

  // Initialize the application
  initializeStaticNodes();
  updateConnections();
  centerView(); // Center the view after initialization

  // Setup resize observer
  if (typeof ResizeObserver !== "undefined") {
    const resizeObserver = new ResizeObserver(() => updateConnections());
    resizeObserver.observe(mindMapContainer);
  } else {
    window.addEventListener("resize", updateConnections);
  }

  // Editor placeholder handling
  if (nodeInputArea && nodeInputArea.getAttribute("placeholder")) {
    if (nodeInputArea.innerHTML.trim() === "") {
      nodeInputArea.classList.add("is-placeholder");
    }
    nodeInputArea.addEventListener("focus", () => nodeInputArea.classList.remove("is-placeholder"));
    nodeInputArea.addEventListener("blur", () => {
      if (nodeInputArea.innerHTML.trim() === "") {
        nodeInputArea.classList.add("is-placeholder");
      }
    });
  }

  // Zoom Controls
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      updateZoom(currentZoom + 0.1);
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      updateZoom(currentZoom - 0.1);
    });
  }

  if (resetZoomBtn) {
    resetZoomBtn.addEventListener('click', () => {
      currentZoom = 1;
      // Find the root node
      const rootNode = nodes.find(n => n.id === "node-lap-trinh-web");
      if (rootNode) {
        const nodeElement = document.getElementById(rootNode.id);
        if (nodeElement) {
          const canvasPane = document.querySelector('.canvas-pane');
          const paneRect = canvasPane.getBoundingClientRect();
          
          // Calculate the center position of the node
          const nodeCenterX = rootNode.x + (nodeElement.offsetWidth / 2);
          const nodeCenterY = rootNode.y + (nodeElement.offsetHeight / 2);
          
          // Calculate the pan offset needed to center the node in the viewport
          panOffsetX = (paneRect.width / 2) - nodeCenterX;
          panOffsetY = (paneRect.height / 2) - nodeCenterY;
        }
      } else {
        // If no root node found, reset to default center
        panOffsetX = 0;
        panOffsetY = 0;
      }
      updateZoom(1);
    });
  }

  // Pan functionality
  mindMapContainer.addEventListener('mousedown', (e) => {
    // Only start panning if we're not clicking on a node and not in connection mode
    if (!e.target.closest('.node') && !isConnectionMode) {
      e.preventDefault();
      isPanning = true;
      panStartX = e.clientX - panOffsetX;
      panStartY = e.clientY - panOffsetY;
      mindMapContainer.style.cursor = 'grabbing';
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (isPanning) {
      panOffsetX = e.clientX - panStartX;
      panOffsetY = e.clientY - panStartY;
      mindMapContainer.style.transform = `scale(${currentZoom}) translate(${panOffsetX}px, ${panOffsetY}px)`;
      updateMinimap();
    }
  });

  document.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      mindMapContainer.style.cursor = 'grab';
    }
  });

  // Mouse wheel zoom
  mindMapContainer.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      updateZoom(currentZoom + delta);
    }
  });

  // Initialize minimap
  updateMinimap();

  // ===== Zoom and Pan Functions =====
  function updateZoom(zoom) {
    currentZoom = Math.max(0.1, Math.min(2, zoom));
    mindMapContainer.style.transform = `scale(${currentZoom}) translate(${panOffsetX}px, ${panOffsetY}px)`;
    updateMinimap();
  }

  function updateMinimap() {
    if (!minimapIndicator) return;

    const containerRect = mindMapContainer.getBoundingClientRect();
    const canvasRect = document.querySelector('.canvas-pane').getBoundingClientRect();
    
    // Calculate the visible portion of the mind map
    const visibleWidth = canvasRect.width / currentZoom;
    const visibleHeight = canvasRect.height / currentZoom;
    
    // Calculate the scale factors for the minimap
    const scaleX = minimapIndicator.offsetWidth / mindMapContainer.offsetWidth;
    const scaleY = minimapIndicator.offsetHeight / mindMapContainer.offsetHeight;
    
    // Update viewport indicator
    const viewport = minimapIndicator.querySelector('.minimap-viewport');
    if (viewport) {
      viewport.style.width = `${visibleWidth * scaleX}px`;
      viewport.style.height = `${visibleHeight * scaleY}px`;
      viewport.style.left = `${-panOffsetX * scaleX}px`;
      viewport.style.top = `${-panOffsetY * scaleY}px`;
    }

    // Create or update node indicators
    let nodeContainer = minimapIndicator.querySelector('.minimap-nodes');
    if (!nodeContainer) {
      nodeContainer = document.createElement('div');
      nodeContainer.className = 'minimap-nodes';
      nodeContainer.style.position = 'absolute';
      nodeContainer.style.top = '0';
      nodeContainer.style.left = '0';
      nodeContainer.style.width = '100%';
      nodeContainer.style.height = '100%';
      nodeContainer.style.pointerEvents = 'none';
      minimapIndicator.appendChild(nodeContainer);
    }

    // Clear existing node indicators
    nodeContainer.innerHTML = '';

    // Add indicators for each node
    nodes.forEach(node => {
      const nodeEl = document.getElementById(node.id);
      if (nodeEl) {
        const nodeIndicator = document.createElement('div');
        nodeIndicator.className = 'minimap-node';
        nodeIndicator.style.position = 'absolute';
        nodeIndicator.style.width = `${Math.max(4, nodeEl.offsetWidth * scaleX)}px`;
        nodeIndicator.style.height = `${Math.max(4, nodeEl.offsetHeight * scaleY)}px`;
        nodeIndicator.style.left = `${node.x * scaleX}px`;
        nodeIndicator.style.top = `${node.y * scaleY}px`;
        nodeIndicator.style.backgroundColor = nodeEl.style.backgroundColor || '#FFFFE0';
        nodeIndicator.style.borderRadius = '2px';
        nodeIndicator.style.border = '1px solid rgba(0,0,0,0.2)';
        nodeContainer.appendChild(nodeIndicator);
      }
    });
  }
});
