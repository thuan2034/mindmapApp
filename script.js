document.addEventListener("DOMContentLoaded", () => {
  const mindMapContainer = document.getElementById("mindMapContainer");
  const nodeInputArea = document.getElementById("node-input-area");
  const saveBtn = document.querySelector(".save-btn");
  const editorTitle = document.querySelector(".editor-pane h2");
  const addNodeButton = document.getElementById("addNodeButton");
  const editorToolbar = document.querySelector(".editor-toolbar");
  let isConnectionMode = false;
  let connectionSourceNodeId = null;
  let nodes = []; // To store node data (name, contentHtml, contentText, position, id, color)
  let selectedNodeId = null;
  let nodeIdCounter = 0; // For generating unique IDs

  let isDragging = false;
  let activeDraggableNode = null;
  let dragOffsetX, dragOffsetY;

  // --- RICH TEXT EDITOR (Simplified) ---
  if (editorToolbar) {
    editorToolbar.addEventListener("click", (e) => {
      const button = e.target.closest("button");
      if (button && button.dataset.command) {
        const command = button.dataset.command;
        const value = button.dataset.value || null;
        document.execCommand(command, false, value);
        nodeInputArea.focus(); // Keep focus in the editor
      }
    });
  }

  // Function to escape HTML to prevent XSS when setting innerHTML from user input
  function escapeHTML(str) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // Function to create a new node element
  function createNodeElement(nodeData) {
    const nodeDiv = document.createElement("div");
    nodeDiv.classList.add("node");
    nodeDiv.id = nodeData.id;
    nodeDiv.style.left = nodeData.x + "px";
    nodeDiv.style.top = nodeData.y + "px";
    if (nodeData.color) {
      nodeDiv.style.backgroundColor = nodeData.color;
    }
    // Display the node name only
    const displayText = nodeData.name || "Node";
    nodeDiv.innerHTML = escapeHTML(displayText);
    // Store content for editor
    nodeDiv.dataset.contentHtml = nodeData.contentHtml;
    nodeDiv.dataset.contentText = nodeData.contentText;

    nodeDiv.addEventListener("mousedown", onNodeMouseDown);
    // Click handled in mouseup
    return nodeDiv;
  }

  // Function to add a new node to the canvas and data structure
  function addNode(
    name = "New Node",
    x = 50,
    y = 50,
    color = "#FFFFE0",
    contentHtml = ""
  ) {
    nodeIdCounter++;
    const defaultHtml = contentHtml || name;
    const contentText =
      new DOMParser().parseFromString(defaultHtml, "text/html").body
        .textContent || "";
    const newNodeData = {
      id: `node-generated-${nodeIdCounter}`,
      name: name,
      contentHtml: defaultHtml,
      contentText: contentText,
      x: x,
      y: y,
      color: color,
      connections: [],
    };
    nodes.push(newNodeData);
    const nodeElement = createNodeElement(newNodeData);
    mindMapContainer.appendChild(nodeElement);
    selectNode(newNodeData.id);
    return newNodeData;
  }

  // Function to load node content into the editor
  function loadNodeInEditor(nodeId) {
    const nodeData = nodes.find((n) => n.id === nodeId);
    if (nodeData) {
      selectedNodeId = nodeId;
      // Show node name in title
      editorTitle.textContent = escapeHTML(nodeData.name) || "Edit Node";
      // Load the content into the editor
      nodeInputArea.innerHTML = nodeData.contentHtml;
      updateNodeSelectionVisual();
    }
  }

  function selectNode(nodeId) {
    if (nodeId === selectedNodeId && nodeInputArea.innerHTML !== "") return;
    loadNodeInEditor(nodeId);
  }

  function updateNodeSelectionVisual() {
    document
      .querySelectorAll(".node")
      .forEach((n) => n.classList.remove("selected-canvas"));
    if (selectedNodeId) {
      const nodeEl = document.getElementById(selectedNodeId);
      if (nodeEl) nodeEl.classList.add("selected-canvas");
    }
  }
  // Handle edit button click to enable title editing
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
  // Handle Connect Nodes button
  const connectNodesButton = document.getElementById("connectNodesButton");
  if (connectNodesButton) {
    connectNodesButton.addEventListener("click", () => {
      isConnectionMode = true;
      connectionSourceNodeId = null;
    });
  }

  // Modified node mouseup handler to handle connections
  function onNodeMouseUp(e) {
    if (activeDraggableNode) {
      if (!isDragging) {
        if (isConnectionMode) {
          if (!connectionSourceNodeId) {
            connectionSourceNodeId = activeDraggableNode.id;
            activeDraggableNode.classList.add("connection-source");
          } else {
            const targetNodeId = activeDraggableNode.id;
            const sourceNode = nodes.find(
              (n) => n.id === connectionSourceNodeId
            );

            if (sourceNode && sourceNode.id !== targetNodeId) {
              if (!sourceNode.connections.includes(targetNodeId)) {
                sourceNode.connections.push(targetNodeId);
                updateConnections();
              }
            }

            // Reset connection mode
            document
              .querySelectorAll(".node.connection-source")
              .forEach((n) => n.classList.remove("connection-source"));
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
  // Save button functionality
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const currentHtmlContent = nodeInputArea.innerHTML;
      const currentTextContent =
        nodeInputArea.textContent || nodeInputArea.innerText;

      if (selectedNodeId) {
        const nodeData = nodes.find((n) => n.id === selectedNodeId);
        if (nodeData) {
          // Update only the content, not the name
          nodeData.contentHtml = currentHtmlContent;
          nodeData.contentText = currentTextContent;

          const nodeElement = document.getElementById(selectedNodeId);
          if (nodeElement) {
            nodeElement.dataset.contentHtml = currentHtmlContent;
            nodeElement.dataset.contentText = currentTextContent;
          }
          console.log("Node content saved:", nodeData);
        }
      } else {
        // Create new node from editor if none selected
        if (currentTextContent.trim() || currentHtmlContent.trim()) {
          addNode("New Node", 70, 70, "#FFFFE0", currentHtmlContent);
        }
      }
    });
  }

  // Add node button on canvas
  if (addNodeButton) {
    addNodeButton.addEventListener("click", () => {
      const canvasRect = mindMapContainer.getBoundingClientRect();
      const newNode = addNode(
        "New Canvas Node",
        Math.random() * (canvasRect.width - 100),
        Math.random() * (canvasRect.height - 50),
        "#FFFFE0",
        ""
      );
      nodeInputArea.focus();
    });
  }

  // --- DRAGGING FUNCTIONALITY ---
  let nodeClickPrevented = false;

  function onNodeMouseDown(e) {
    if (e.button !== 0) return;

    activeDraggableNode = e.target.closest(".node");
    if (!activeDraggableNode) return;

    isDragging = false;
    nodeClickPrevented = false;

    const rect = activeDraggableNode.getBoundingClientRect();
    const containerRect = mindMapContainer.getBoundingClientRect();

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
    let newX =
      e.clientX -
      containerRect.left -
      dragOffsetX +
      mindMapContainer.scrollLeft;
    let newY =
      e.clientY - containerRect.top - dragOffsetY + mindMapContainer.scrollTop;

    const nodeWidth = activeDraggableNode.offsetWidth;
    const nodeHeight = activeDraggableNode.offsetHeight;
    newX = Math.max(
      0,
      Math.min(newX, mindMapContainer.scrollWidth - nodeWidth)
    );
    newY = Math.max(
      0,
      Math.min(newY, mindMapContainer.scrollHeight - nodeHeight)
    );

    activeDraggableNode.style.left = newX + "px";
    activeDraggableNode.style.top = newY + "px";

    const nodeData = nodes.find((n) => n.id === activeDraggableNode.id);
    if (nodeData) {
      nodeData.x = newX;
      nodeData.y = newY;
    }
    updateConnections();
  }

  function onNodeDragEnd(e) {
    if (activeDraggableNode) {
      if (!isDragging) {
        selectNode(activeDraggableNode.id);
      }
      activeDraggableNode.classList.remove("dragging");
      activeDraggableNode.style.zIndex = "";
    }

    isDragging = false;
    activeDraggableNode = null;
    document.removeEventListener("mousemove", onNodeMouseMove);
    document.removeEventListener("mouseup", onNodeDragEnd);
  }

  // --- INITIALIZE STATIC NODES (from HTML) ---
  function initializeStaticNodes() {
    const staticNodeElements = mindMapContainer.querySelectorAll(
      '.node:not([id^="node-generated-"])'
    );
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

    // Example: define connections
    const lapTrinhWebNode = nodes.find((n) => n.id === "node-lap-trinh-web");
    if (lapTrinhWebNode) {
      lapTrinhWebNode.connections = [
        "node-oop",
        "node-csdl",
        "node-new",
        "node-uiux",
      ];
    }

    if (nodes.length === 0) {
      editorTitle.textContent = "New node";
      nodeInputArea.innerHTML = "";
      nodeInputArea.setAttribute("placeholder", "Nhập nội dung...");
      selectedNodeId = null;
    }
    updateNodeSelectionVisual();
  }

  // --- CONNECTOR LINES (SVG Implementation) ---
  let svgLinesContainer = null;

  function ensureSvgContainer() {
    if (!svgLinesContainer) {
      svgLinesContainer = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );
      svgLinesContainer.style.position = "absolute";
      svgLinesContainer.style.top = "0";
      svgLinesContainer.style.left = "0";
      svgLinesContainer.style.width = "100%";
      svgLinesContainer.style.height = "100%";
      svgLinesContainer.style.pointerEvents = "none";
      mindMapContainer.insertBefore(
        svgLinesContainer,
        mindMapContainer.firstChild
      );
    }
    svgLinesContainer.setAttribute("width", mindMapContainer.scrollWidth);
    svgLinesContainer.setAttribute("height", mindMapContainer.scrollHeight);
  }

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

  // --- INITIALIZATION ---
  initializeStaticNodes();
  updateConnections();

  if (typeof ResizeObserver !== "undefined") {
    const resizeObserver = new ResizeObserver(() => updateConnections());
    resizeObserver.observe(mindMapContainer);
  } else {
    window.addEventListener("resize", updateConnections);
  }

  // Fallback for editor placeholder
  if (nodeInputArea && nodeInputArea.getAttribute("placeholder")) {
    if (nodeInputArea.innerHTML.trim() === "")
      nodeInputArea.classList.add("is-placeholder");
    nodeInputArea.addEventListener("focus", () =>
      nodeInputArea.classList.remove("is-placeholder")
    );
    nodeInputArea.addEventListener("blur", () => {
      if (nodeInputArea.innerHTML.trim() === "")
        nodeInputArea.classList.add("is-placeholder");
    });
  }
});
