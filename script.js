document.addEventListener("DOMContentLoaded", () => {
  // ===== DOM Elements =====
  const mindMapContainer = document.getElementById("mindMapContainer");
  const nodeInputArea = document.getElementById("node-input-area");
  const fileViewerArea = document.getElementById("file-viewer-area");
  const saveBtn = document.querySelector(".save-btn");
  const editorTitle = document.querySelector(".editor-pane h2");
  const addNodeButton = document.getElementById("addNodeButton");
  const editorToolbar = document.querySelector(".editor-toolbar");
  const nodeFileInput = document.getElementById("nodeFileInput");
  const uploadFileToolbarButton = document.getElementById("uploadFileToolbarButton");
  const connectNodesButton = document.getElementById("connectNodesButton");
  const deleteNodeBtn = document.getElementById("deleteNodeBtn");
  const searchInput = document.querySelector(".search-container input");

  // ===== State Variables =====
  let isConnectionMode = false;
  let connectionSourceNodeId = null;
  let nodes = []; // Store node data (name, contentHtml, contentText, position, id, color, fileData)
  let selectedNodeId = null;
  let nodeIdCounter = 0;
  let isDragging = false;
  let activeDraggableNode = null;
  let dragOffsetX, dragOffsetY;
  let nodeClickPrevented = false;
  let svgLinesContainer = null;

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

    nodeDiv.addEventListener("mousedown", onNodeMouseDown);
    return nodeDiv;
  }

  function addNode(name = "New Node", x = 50, y = 50, color = "#FFFFE0", contentHtml = "", fileData = null) {
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
      fileData: fileData
    };
    
    nodes.push(newNodeData);
    const nodeElement = createNodeElement(newNodeData);
    mindMapContainer.appendChild(nodeElement);
    selectNode(newNodeData.id);
    return newNodeData;
  }

  function selectNode(nodeId) {
    if (nodeId === selectedNodeId && nodeInputArea.innerHTML !== "") return;
    loadNodeInEditor(nodeId);
  }

  function loadNodeInEditor(nodeId) {
    const nodeData = nodes.find((n) => n.id === nodeId);
    if (nodeData) {
      selectedNodeId = nodeId;
      editorTitle.textContent = escapeHTML(nodeData.name) || "Edit Node";
      
      if (nodeData.fileData) {
        nodeInputArea.style.display = "none";
        fileViewerArea.style.display = "block";
        
        if (nodeData.fileData.type.startsWith('image/')) {
          fileViewerArea.innerHTML = `<img src="${nodeData.fileData.url}" alt="Uploaded image" style="max-width: 100%; max-height: 100%;">`;
        } else if (nodeData.fileData.type === 'application/pdf') {
          fileViewerArea.innerHTML = `<embed src="${nodeData.fileData.url}" type="application/pdf" width="100%" height="100%">`;
        }
      } else {
        nodeInputArea.style.display = "block";
        fileViewerArea.style.display = "none";
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
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;

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
    let newX = e.clientX - containerRect.left - dragOffsetX + mindMapContainer.scrollLeft;
    let newY = e.clientY - containerRect.top - dragOffsetY + mindMapContainer.scrollTop;

    const nodeWidth = activeDraggableNode.offsetWidth;
    const nodeHeight = activeDraggableNode.offsetHeight;
    newX = Math.max(0, Math.min(newX, mindMapContainer.scrollWidth - nodeWidth));
    newY = Math.max(0, Math.min(newY, mindMapContainer.scrollHeight - nodeHeight));

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

      if (selectedNodeId) {
        const nodeData = nodes.find((n) => n.id === selectedNodeId);
        if (nodeData) {
          nodeData.fileData = fileData;
          const nodeEl = document.getElementById(selectedNodeId);
          if (nodeEl) {
            nodeEl.dataset.fileData = JSON.stringify(fileData);
          }
          loadNodeInEditor(selectedNodeId);
        }
      } else {
        addNode(file.name, 70, 70, "#FFFFE0", "", fileData);
      }

      nodeFileInput.value = "";
    });
  }

  // Save Button
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      if (selectedNodeId) {
        const nodeData = nodes.find((n) => n.id === selectedNodeId);
        if (nodeData) {
          if (nodeData.fileData) {
            return;
          }
          const currentHtmlContent = nodeInputArea.innerHTML;
          const currentTextContent = nodeInputArea.textContent || nodeInputArea.innerText;
          nodeData.contentHtml = currentHtmlContent;
          nodeData.contentText = currentTextContent;

          const nodeElement = document.getElementById(selectedNodeId);
          if (nodeElement) {
            nodeElement.dataset.contentHtml = currentHtmlContent;
            nodeElement.dataset.contentText = currentTextContent;
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
      addNode(
        "New Canvas Node",
        Math.random() * (canvasRect.width - 100),
        Math.random() * (canvasRect.height - 50),
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

  // Node Title Editing
  const editBtn = document.querySelector(".edit-btn");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      const titleElement = editorTitle;
      titleElement.contentEditable = true;
      titleElement.focus();

      const finishEditing = () => {
        titleElement.contentEditable = false;
        const newName = titleElement.textContent.trim();
        if (selectedNodeId && newName) {
          const node = nodes.find((n) => n.id === selectedNodeId);
          if (node) {
            node.name = newName;
            const nodeEl = document.getElementById(selectedNodeId);
            if (nodeEl) nodeEl.textContent = newName;
          }
        }
      };

      titleElement.addEventListener("blur", finishEditing);
      titleElement.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          finishEditing();
        }
      });
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
  function searchNodes(query) {
    // Remove previous search highlights
    document.querySelectorAll('.node.search-highlight').forEach(node => {
      node.classList.remove('search-highlight');
    });

    if (!query.trim()) {
      return;
    }

    const searchResults = nodes.filter(node => 
      node.name.toLowerCase().includes(query.toLowerCase())
    );

    // Highlight matching nodes
    searchResults.forEach(node => {
      const nodeElement = document.getElementById(node.id);
      if (nodeElement) {
        nodeElement.classList.add('search-highlight');
      }
    });

    // If there's exactly one match, select it
    if (searchResults.length === 1) {
      selectNode(searchResults[0].id);
    }

    return searchResults;
  }

  // Search Input
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const query = e.target.value.trim();
        const results = searchNodes(query);
        
        // Update search results count if needed
        const searchContainer = searchInput.closest('.search-container');
        let resultsCount = searchContainer.querySelector('.search-results-count');
        
        if (query && results) {
          if (!resultsCount) {
            resultsCount = document.createElement('span');
            resultsCount.className = 'search-results-count';
            searchContainer.appendChild(resultsCount);
          }
          resultsCount.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;
        } else if (resultsCount) {
          resultsCount.remove();
        }
      }, 300); // Debounce search for better performance
    });

    // Clear search on escape
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        document.querySelectorAll('.node.search-highlight').forEach(node => {
          node.classList.remove('search-highlight');
        });
        const resultsCount = searchInput.closest('.search-container').querySelector('.search-results-count');
        if (resultsCount) {
          resultsCount.remove();
        }
      }
    });
  }

  // ===== Initialization =====
  function initializeStaticNodes() {
    const staticNodeElements = mindMapContainer.querySelectorAll('.node:not([id^="node-generated-"])');
    let maxIdNum = 0;

    staticNodeElements.forEach((nodeEl) => {
      if (nodes.find((n) => n.id === nodeEl.id)) return;

      const idParts = nodeEl.id.split("-");
      const numPart = parseInt(idParts[idParts.length - 1], 10);
      if (!isNaN(numPart)) maxIdNum = Math.max(maxIdNum, numPart);

      const nameText = nodeEl.textContent.trim();
      const initialColor = nodeEl.style.backgroundColor || "#FFFFE0";
      const newNodeData = {
        id: nodeEl.id,
        name: nameText,
        contentHtml: escapeHTML(nameText),
        contentText: nameText,
        x: parseInt(nodeEl.style.left || "50", 10),
        y: parseInt(nodeEl.style.top || "50", 10),
        color: initialColor,
        connections: [],
      };
      nodes.push(newNodeData);
      nodeEl.dataset.contentHtml = newNodeData.contentHtml;
      nodeEl.dataset.contentText = newNodeData.contentText;
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

  // Initialize the application
  initializeStaticNodes();
  updateConnections();

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
});
