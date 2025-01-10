// API base URL
// const API_BASE_URL = 'http://kelas-king.site:9000';
const API_BASE_URL = 'http://kelas-king.site:9000';

// DOM Elements
const authForm = document.getElementById('auth-form');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const deleteAccountBtn = document.getElementById('delete-account-btn');
const authSection = document.getElementById('auth-section');
const mainSection = document.getElementById('main-section');
const userWelcome = document.getElementById('user-welcome');
const booksTable = document.getElementById('books-table').getElementsByTagName('tbody')[0];
const loansTable = document.getElementById('loans-table').getElementsByTagName('tbody')[0];

// Notification function
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
    }, 4000);
}

// Event Listeners
authForm.addEventListener('submit', handleLogin);
registerBtn.addEventListener('click', handleRegister);
logoutBtn.addEventListener('click', handleLogout);
deleteAccountBtn.addEventListener('click', handleDeleteAccount);

// Helper function for making authenticated API calls
async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('No authentication token found');
    }
    return fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });
}

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
            mode: 'cors'  // Add CORS mode here as well
        });
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('username', username);
            showNotification('Login successful!');
            showMainSection(username);
        } else {
            const errorData = await response.json();
            showNotification(errorData.message || 'Invalid credentials', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('An error occurred during login', 'error');
    }
}

async function handleRegister() {
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            mode: 'cors',
            credentials: 'include',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        if (response.ok) {
            showNotification('Registration successful. Please log in.');
        } else {
            showNotification(data.message || 'Registration failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Unable to connect to the server. Please try again.', 'error');
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    authSection.style.display = 'block';
    mainSection.style.display = 'none';
    showNotification('Logged out successfully');
}

async function handleDeleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/auth/delete`, { 
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                mode: 'cors'  // Add CORS mode here as well
            });
            if (response.ok) {
                showNotification('Account deleted successfully');
                handleLogout();
            } else {
                const errorData = await response.json();
                showNotification(errorData.message || 'Failed to delete account', 'error');
            }
        } catch (error) {
            console.error('Delete account error:', error);
            showNotification('An error occurred while deleting the account', 'error');
        }
    }
}

// Book and Loan Functions
async function fetchAvailableBooks() {
    try {
        const [booksResponse, activeLoansResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/books`, { mode: 'cors' }),  // Add CORS mode here
            authenticatedFetch(`${API_BASE_URL}/loans/active/${localStorage.getItem('userId')}`, { mode: 'cors' })  // Add CORS mode here
        ]);

        if (booksResponse.ok && activeLoansResponse.ok) {
            const allBooks = await booksResponse.json();
            const activeLoans = await activeLoansResponse.json();

            const loanedBookIds = new Set(activeLoans.map(loan => loan.bookId));
            const availableBooks = allBooks.filter(book => !loanedBookIds.has(book.id));

            renderBooks(availableBooks);
        } else {
            const errorData = await (booksResponse.ok ? activeLoansResponse : booksResponse).json();
            showNotification(errorData.message || 'Failed to fetch books or active loans', 'error');
        }
    } catch (error) {
        console.error('Error fetching available books:', error);
        showNotification('Error fetching available books', 'error');
    }
}

async function fetchUserLoans() {
    const userId = localStorage.getItem('userId');
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/loans/user/${userId}`, { mode: 'cors' });  // Add CORS mode here
        if (response.ok) {
            const loans = await response.json();
            renderLoans(loans);
        } else {
            const errorData = await response.json();
            showNotification(errorData.message || 'Failed to fetch user loans', 'error');
        }
    } catch (error) {
        console.error('Error fetching user loans:', error);
        showNotification('Error fetching user loans', 'error');
    }
}

async function createLoan(bookId) {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/loans/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId }),
            mode: 'cors'  // Add CORS mode here
        });
        if (response.ok) {
            showNotification('Book loaned successfully');
            fetchAvailableBooks();
            fetchUserLoans();
        } else {
            const errorData = await response.json();
            showNotification(errorData.message || 'Failed to loan book', 'error');
        }
    } catch (error) {
        console.error('Error creating loan:', error);
        showNotification('An error occurred while loaning the book', 'error');
    }
}

async function returnBook(loanId) {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/loans/return/${loanId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors'  // Add CORS mode here
        });
        if (response.ok) {
            showNotification('Book returned successfully');
            fetchAvailableBooks();
            fetchUserLoans();
        } else {
            const errorData = await response.json();
            showNotification(errorData.message || 'Failed to return book', 'error');
        }
    } catch (error) {
        console.error('Error returning book:', error);
        showNotification('An error occurred while returning the book', 'error');
    }
}

// Render Functions
function renderBooks(books) {
    booksTable.innerHTML = '';
    books.forEach(book => {
        const row = booksTable.insertRow();
        row.insertCell(0).textContent = book.title;
        row.insertCell(1).textContent = book.author;
        const actionCell = row.insertCell(2);
        const loanBtn = document.createElement('button');
        loanBtn.textContent = 'Loan';
        loanBtn.onclick = () => createLoan(book.id);
        actionCell.appendChild(loanBtn);
    });
}

function renderLoans(loans) {
    loansTable.innerHTML = '';
    loans.forEach(loan => {
        const row = loansTable.insertRow();
        row.insertCell(0).textContent = loan.bookTitle;
        row.insertCell(1).textContent = new Date(loan.loanDate).toLocaleDateString();
        const actionCell = row.insertCell(2);
        const returnBtn = document.createElement('button');
        returnBtn.textContent = 'Return';
        returnBtn.onclick = () => returnBook(loan.id);
        actionCell.appendChild(returnBtn);
    });
}

function showMainSection(username) {
    authSection.style.display = 'none';
    mainSection.style.display = 'block';
    userWelcome.textContent = username;
    fetchAvailableBooks();
    fetchUserLoans();
}

// Check if user is already logged in
const token = localStorage.getItem('token');
if (token) {
    const username = localStorage.getItem('username') || 'User';
    showMainSection(username);
}

function checkServerConnection() {
    console.log('Attempting to connect to server...');
    fetch(`${API_BASE_URL}`, { mode: 'cors' })  // Add CORS mode here
        .then(response => {
            if (response.ok) {
                console.log('Server is reachable and responding correctly');
                showNotification('Connected to server successfully', 'success');
            } else {
                console.error('Server is reachable but not responding correctly. Status:', response.status);
                showNotification('Server is not responding correctly', 'error');
            }
        })
        .catch(error => {
            console.error('Unable to reach the server:', error);
            showNotification('Unable to connect to the server. Please check your internet connection and try again.', 'error');
        });
}
