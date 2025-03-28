const BLOG_PASSWORD = "ooty";

// DOM Elements
const loginSection = document.getElementById('loginSection');
const blogSection = document.getElementById('blogSection');
const createPostSection = document.getElementById('createPostSection');
const githubSetupSection = document.getElementById('githubSetupSection');
const loginForm = document.getElementById('loginForm');
const postForm = document.getElementById('postForm');
const githubForm = document.getElementById('githubForm');
const postsList = document.getElementById('postsList');
const newPostBtn = document.getElementById('newPostBtn');
const syncBtn = document.getElementById('syncBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginMsg = document.getElementById('loginMsg');
const postMsg = document.getElementById('postMsg');
const toggleGithubSetup = document.getElementById('toggleGithubSetup');
const toggleSetupHelp = document.getElementById('toggleSetupHelp');
const setupHelp = document.getElementById('setupHelp');
const githubStatus = document.getElementById('githubStatus');
const publishBtn = document.getElementById('publishBtn');

// GitHub info
let githubConnected = false;
let githubUsername = '';
let githubRepo = '';
let githubToken = '';

// Check if user is logged in
function checkAuth() {
    const isAuthenticated = localStorage.getItem('blogAuth') === 'true';
    loginSection.classList.toggle('hidden', isAuthenticated);
    blogSection.classList.toggle('hidden', !isAuthenticated);
    
    if (isAuthenticated) {
        loadPosts();
        loadGitHubSettings();
    }
}

// Login handler
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    
    if (password === BLOG_PASSWORD) {
        localStorage.setItem('blogAuth', 'true');
        loginMsg.classList.add('hidden');
        checkAuth();
    } else {
        showLoginError('Incorrect password. Please try again.');
        document.getElementById('password').value = '';
    }
});

// Show login error message
function showLoginError(message) {
    loginMsg.textContent = message;
    loginMsg.classList.remove('hidden', 'success');
    loginMsg.classList.add('error');
}

// Show post message
function showPostMessage(message, isError = false) {
    postMsg.textContent = message;
    postMsg.classList.remove('hidden', 'success', 'error');
    postMsg.classList.add(isError ? 'error' : 'success');
}

// Logout handler
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('blogAuth');
    checkAuth();
});

// Toggle new post form
newPostBtn.addEventListener('click', () => {
    createPostSection.classList.toggle('hidden');
    githubSetupSection.classList.add('hidden');
});

// Toggle GitHub setup
toggleGithubSetup.addEventListener('click', () => {
    githubSetupSection.classList.toggle('hidden');
    createPostSection.classList.add('hidden');
});

// Toggle setup help
toggleSetupHelp.addEventListener('click', () => {
    setupHelp.classList.toggle('hidden');
    toggleSetupHelp.textContent = setupHelp.classList.contains('hidden') ? 
        '(Show Help)' : '(Hide Help)';
});

// GitHub setup handler
githubForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    githubUsername = document.getElementById('githubUsername').value;
    githubRepo = document.getElementById('githubRepo').value;
    githubToken = document.getElementById('githubToken').value;
    
    // Save GitHub info (except token for security)
    localStorage.setItem('githubUsername', githubUsername);
    localStorage.setItem('githubRepo', githubRepo);
    
    // Verify GitHub connection by checking if the repo exists
    verifyGitHubConnection()
        .then(connected => {
            githubConnected = connected;
            
            if (connected) {
                updateGitHubStatus(true);
                syncBtn.classList.remove('hidden');
                githubSetupSection.classList.add('hidden');
                loadPosts(true); // Force reload from GitHub
            } else {
                updateGitHubStatus(false);
                alert('Could not connect to GitHub repository. Please check your credentials and try again.');
            }
        });
});

// Sync posts with GitHub
syncBtn.addEventListener('click', () => {
    if (githubConnected) {
        loadPosts(true); // Force reload from GitHub
    } else {
        alert('Please connect to GitHub first');
        githubSetupSection.classList.remove('hidden');
    }
});

// Load GitHub settings
function loadGitHubSettings() {
    githubUsername = localStorage.getItem('githubUsername') || '';
    githubRepo = localStorage.getItem('githubRepo') || '';
    
    if (githubUsername && githubRepo) {
        document.getElementById('githubUsername').value = githubUsername;
        document.getElementById('githubRepo').value = githubRepo;
        
        // Check if the connection still works
        verifyGitHubConnection()
            .then(connected => {
                githubConnected = connected;
                updateGitHubStatus(connected);
                if (connected) {
                    syncBtn.classList.remove('hidden');
                }
            });
    }
}

// Update GitHub status badge
function updateGitHubStatus(connected) {
    githubStatus.textContent = connected ? 
        'GitHub: Connected' : 'GitHub: Not Connected';
    githubStatus.classList.toggle('status-connected', connected);
    githubStatus.classList.toggle('status-disconnected', !connected);
}

// Verify GitHub connection
async function verifyGitHubConnection() {
    try {
        const response = await fetch(`https://api.github.com/repos/${githubUsername}/${githubRepo}`, {
            headers: {
                'Authorization': `token ${githubToken}`
            }
        });
        
        return response.status === 200;
    } catch (error) {
        console.error('GitHub connection error:', error);
        return false;
    }
}

// Create new post
postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('postTitle').value;
    const content = document.getElementById('postContent').value;
    const author = document.getElementById('author').value;
    const date = new Date().toISOString();
    
    const newPost = {
        title,
        content,
        date,
        author
    };
    
    // Add loading spinner to publish button
    const originalBtnText = publishBtn.innerHTML;
    publishBtn.innerHTML = '<span class="loading-spinner"></span> Publishing...';
    publishBtn.disabled = true;
    
    try {
        // Get existing posts or initialize empty array
        const posts = JSON.parse(localStorage.getItem('blogPosts') || '[]');
        
        // Add new post to the beginning of the array
        posts.unshift(newPost);
        
        // Save back to localStorage
        localStorage.setItem('blogPosts', JSON.stringify(posts));
        
        // If GitHub is connected, also save to GitHub
        if (githubConnected) {
            const success = await savePostsToGitHub(posts);
            if (success) {
                showPostMessage('Post published and saved to GitHub!');
            } else {
                showPostMessage('Post published locally but failed to save to GitHub. Try syncing later.', true);
            }
        } else {
            showPostMessage('Post published locally. Connect to GitHub to save permanently.');
        }
        
        // Reset form and hide it
        postForm.reset();
        setTimeout(() => {
            createPostSection.classList.add('hidden');
            postMsg.classList.add('hidden');
        }, 3000);
        
        // Reload posts
        loadPosts();
    } catch (error) {
        console.error('Error publishing post:', error);
        showPostMessage('Error publishing post: ' + error.message, true);
    } finally {
        // Restore publish button
        publishBtn.innerHTML = originalBtnText;
        publishBtn.disabled = false;
    }
});

// Load posts from GitHub
async function loadPostsFromGitHub() {
    try {
        // First check if posts.js exists in the repo
        const response = await fetch(`https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/posts.js`, {
            headers: {
                'Authorization': `token ${githubToken}`
            }
        });
        
        if (response.status === 200) {
            const data = await response.json();
            const content = atob(data.content); // Decode base64 content
            
            // Extract array from "const BLOG_POSTS = [...];" format
            const postsMatch = content.match(/BLOG_POSTS\s*=\s*(\[[\s\S]*\])/);
            
            if (postsMatch && postsMatch[1]) {
                try {
                    const postsArray = JSON.parse(postsMatch[1]);
                    localStorage.setItem('blogPosts', JSON.stringify(postsArray));
                    return true;
                } catch (parseError) {
                    console.error('Error parsing posts from GitHub:', parseError);
                    return false;
                }
            }
        }
        
        return false;
    } catch (error) {
        console.error('Error loading posts from GitHub:', error);
        return false;
    }
}

// Save posts to GitHub
async function savePostsToGitHub(posts) {
    if (!githubConnected) return false;
    
    try {
        const postsJs = `const BLOG_POSTS = ${JSON.stringify(posts, null, 2)};`;
        const encodedContent = btoa(postsJs); // Encode content to base64
        
        // Check if file already exists
        const checkResponse = await fetch(`https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/posts.js`, {
            headers: {
                'Authorization': `token ${githubToken}`
            }
        });
        
        let sha;
        if (checkResponse.status === 200) {
            const fileData = await checkResponse.json();
            sha = fileData.sha;
        }
        
        // Create or update file
        const response = await fetch(`https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/posts.js`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Update blog posts',
                content: encodedContent,
                sha: sha // Include sha if updating existing file
            })
        });
        
        return response.status === 200 || response.status === 201;
    } catch (error) {
        console.error('Error saving posts to GitHub:', error);
        return false;
    }
}

// Format date nicely
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Load and display posts
async function loadPosts(forceGitHubSync = false) {
    // If GitHub is connected and force sync is requested, load from GitHub
    if (githubConnected && forceGitHubSync) {
        const success = await loadPostsFromGitHub();
        if (!success) {
            console.log('Failed to load posts from GitHub, using local posts');
        }
    }
    
    // Try to load posts from external JS if available
    if (typeof BLOG_POSTS !== 'undefined') {
        localStorage.setItem('blogPosts', JSON.stringify(BLOG_POSTS));
    }
    
    const posts = JSON.parse(localStorage.getItem('blogPosts') || '[]');
    
    if (posts.length === 0) {
        postsList.innerHTML = '<p>No posts yet. Be the first to share your feelings!</p>';
        return;
    }
    
    postsList.innerHTML = '';
    
    posts.forEach(post => {
        const formattedDate = formatDate(post.date);
        
        const postElement = document.createElement('div');
        postElement.className = 'post';
        postElement.innerHTML = `
            <div class="post-header">
                <h3 class="post-title">${post.title}</h3>
                <div class="post-meta">
                    <span>By: ${post.author || 'Anonymous'}</span>
                    <span>${formattedDate}</span>
                </div>
            </div>
            <div class="post-content">${post.content}</div>
        `;
        
        postsList.appendChild(postElement);
    });
}

// Initialize
checkAuth();