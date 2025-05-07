# Interactive Mind Map Application

A modern, interactive mind mapping tool built with HTML, CSS, and JavaScript, featuring a beautiful UI and powerful functionality.

**Live Demo:** [https://mindmap-itss2.web.app](https://mindmap-itss2.web.app)

## Features

- 🎨 Modern and intuitive user interface
- 📝 Rich text editing capabilities
- 🔄 Real-time auto-saving
- 📎 File attachments support (images, PDFs, videos, audio)
- 🔗 Node connections
- 🔍 Search functionality
- 🗺️ Minimap navigation
- 🔎 Zoom and pan controls
- 📱 Responsive design

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)
- Firebase (Hosting & Database)
- Font Awesome Icons

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Firebase CLI
- A modern web browser

### Installation

1. Clone the repository:
```bash
git clone [your-repository-url]
cd [repository-name]
```

2. Install Firebase CLI globally:
```bash
npm install -g firebase-tools
```

3. Login to Firebase:
```bash
firebase login
```

4. Initialize Firebase in your project:
```bash
firebase init
```

5. Configure Firebase:
   - Select "Hosting" when prompted
   - Choose your Firebase project
   - Set "." as your public directory
   - Configure as a single-page app: "No"
   - Don't overwrite index.html: "No"

6. Update Firebase configuration:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select existing one
   - Add a web app to your project
   - Copy the Firebase configuration
   - Replace the placeholder config in `index.html` with your actual config

### Deployment

Deploy to Firebase:
```bash
firebase deploy
```

## Usage

### Creating Nodes
- Click the "+" button in the canvas to add a new node
- Double-click a node to edit its content
- Use the toolbar to format text content

### Managing Files
- Select "File" from the content type selector
- Upload images, PDFs, videos, or audio files
- Files are automatically attached to nodes

### Connecting Nodes
1. Click the "Connect Nodes" button in the toolbar
2. Click the source node
3. Click the target node to create a connection

### Navigation
- Use the minimap to navigate large mind maps
- Zoom in/out using the zoom controls or Ctrl + mouse wheel
- Pan by dragging the canvas
- Use the search bar to find nodes

### Saving
- Changes are automatically saved
- Manual save is also available through the save button

## Project Structure

```
├── index.html          # Main HTML file
├── style.css           # Styles
├── script.js           # Main application logic
├── db.js              # Database operations
├── firebase.json      # Firebase configuration
└── README.md          # This file
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Font Awesome for the icons
- Firebase for hosting and database services
- All contributors who have helped with the project

## Support

If you encounter any issues or have questions, please:
1. Check the existing issues
2. Create a new issue with a detailed description
3. Include steps to reproduce the problem
4. Add screenshots if applicable

## Future Enhancements

- [ ] User authentication
- [ ] Multiple mind maps per user
- [ ] Real-time collaboration
- [ ] Export/Import functionality
- [ ] Version history
- [ ] Custom node styles
- [ ] Keyboard shortcuts
- [ ] Undo/Redo functionality