// Script to add subjects and sample data for all semesters
// Run this in the browser console or as a Node.js script

const subjectsBySemester = {
    "1": ["M1", "Applied Physics", "PPS-1", "BEE"],
    "2": ["M2", "Chemistry", "English", "PPS-2"],
    "3": ["CS-1", "DS", "Python", "FSE", "P&S", "Java"],
    "4": ["DWV", "DAA", "FAI", "DBMS"],
    "5": ["EML", "CS2", "WPM", "ED"]
};

// Sample mock tests for different subjects
const sampleTests = [
    {
        title: "M1 - Differential Calculus",
        subject: "M1",
        semester: "1",
        year: "2024",
        description: "Basic differential calculus concepts and applications",
        duration_minutes: 45,
        questions: [
            {
                question_text: "What is the derivative of sin(x)?",
                option_a: "cos(x)",
                option_b: "-cos(x)",
                option_c: "sin(x)",
                option_d: "-sin(x)",
                correct_answer: "A",
                explanation: "The derivative of sin(x) is cos(x)",
                difficulty_level: "easy"
            },
            {
                question_text: "Find the derivative of x³ + 2x² - 5x + 1",
                option_a: "3x² + 4x - 5",
                option_b: "3x² + 2x - 5",
                option_c: "x² + 4x - 5",
                option_d: "3x² + 4x + 1",
                correct_answer: "A",
                explanation: "Using the power rule: d/dx(x³) = 3x², d/dx(2x²) = 4x, d/dx(-5x) = -5, d/dx(1) = 0",
                difficulty_level: "medium"
            }
        ]
    },
    {
        title: "Applied Physics - Mechanics",
        subject: "Applied Physics",
        semester: "1",
        year: "2024",
        description: "Basic mechanics concepts including motion, forces, and energy",
        duration_minutes: 40,
        questions: [
            {
                question_text: "What is the SI unit of force?",
                option_a: "Joule",
                option_b: "Newton",
                option_c: "Watt",
                option_d: "Pascal",
                correct_answer: "B",
                explanation: "The SI unit of force is Newton (N)",
                difficulty_level: "easy"
            },
            {
                question_text: "A car accelerates from rest to 20 m/s in 5 seconds. What is its acceleration?",
                option_a: "2 m/s²",
                option_b: "4 m/s²",
                option_c: "5 m/s²",
                option_d: "10 m/s²",
                correct_answer: "B",
                explanation: "a = (v - u)/t = (20 - 0)/5 = 4 m/s²",
                difficulty_level: "medium"
            }
        ]
    },
    {
        title: "Python Programming - Basics",
        subject: "Python",
        semester: "3",
        year: "2024",
        description: "Basic Python programming concepts including variables, loops, and functions",
        duration_minutes: 35,
        questions: [
            {
                question_text: "Which of the following is the correct way to create a list in Python?",
                option_a: "list = [1, 2, 3]",
                option_b: "list = (1, 2, 3)",
                option_c: "list = {1, 2, 3}",
                option_d: "list = 1, 2, 3",
                correct_answer: "A",
                explanation: "Lists in Python are created using square brackets []",
                difficulty_level: "easy"
            },
            {
                question_text: "What is the output of: print(len('Hello World'))",
                option_a: "10",
                option_b: "11",
                option_c: "12",
                option_d: "Error",
                correct_answer: "B",
                explanation: "The string 'Hello World' has 11 characters including the space",
                difficulty_level: "easy"
            }
        ]
    },
    {
        title: "Data Structures - Arrays and Linked Lists",
        subject: "DS",
        semester: "3",
        year: "2024",
        description: "Basic data structures including arrays, linked lists, and their operations",
        duration_minutes: 50,
        questions: [
            {
                question_text: "What is the time complexity of accessing an element in an array?",
                option_a: "O(1)",
                option_b: "O(n)",
                option_c: "O(log n)",
                option_d: "O(n²)",
                correct_answer: "A",
                explanation: "Array access is O(1) because we can directly access any element using its index",
                difficulty_level: "medium"
            },
            {
                question_text: "Which data structure follows LIFO principle?",
                option_a: "Queue",
                option_b: "Stack",
                option_c: "Array",
                option_d: "Linked List",
                correct_answer: "B",
                explanation: "Stack follows Last In First Out (LIFO) principle",
                difficulty_level: "easy"
            }
        ]
    },
    {
        title: "Database Management Systems - SQL Basics",
        subject: "DBMS",
        semester: "4",
        year: "2024",
        description: "Basic SQL queries, database design, and normalization",
        duration_minutes: 45,
        questions: [
            {
                question_text: "Which SQL command is used to retrieve data from a database?",
                option_a: "GET",
                option_b: "SELECT",
                option_c: "RETRIEVE",
                option_d: "FETCH",
                correct_answer: "B",
                explanation: "SELECT is used to retrieve data from database tables",
                difficulty_level: "easy"
            },
            {
                question_text: "What does ACID stand for in database transactions?",
                option_a: "Atomicity, Consistency, Isolation, Durability",
                option_b: "Access, Control, Integrity, Data",
                option_c: "Authentication, Control, Integrity, Durability",
                option_d: "Atomicity, Control, Isolation, Data",
                correct_answer: "A",
                explanation: "ACID stands for Atomicity, Consistency, Isolation, and Durability",
                difficulty_level: "medium"
            }
        ]
    }
];

// Sample doubts for different subjects
const sampleDoubts = [
    {
        title: "How to solve integration by parts in M1?",
        description: "I'm struggling with integration by parts. Can someone explain the formula and provide a step-by-step example? I understand the formula is ∫u dv = uv - ∫v du, but I'm not sure how to choose u and dv.",
        subject: "M1",
        semester: "1",
        student_name: "Rahul Sharma",
        student_email: "rahul.sharma@email.com"
    },
    {
        title: "Understanding Newton's laws of motion",
        description: "Can someone explain Newton's three laws of motion with practical examples? I understand the basic statements but need help with real-world applications.",
        subject: "Applied Physics",
        semester: "1",
        student_name: "Priya Patel",
        student_email: "priya.patel@email.com"
    },
    {
        title: "Python list vs tuple differences",
        description: "What are the main differences between lists and tuples in Python? When should I use each one?",
        subject: "Python",
        semester: "3",
        student_name: "Amit Kumar",
        student_email: "amit.kumar@email.com"
    },
    {
        title: "Binary tree traversal methods",
        description: "I'm confused about the different ways to traverse a binary tree. Can someone explain preorder, inorder, and postorder traversal with examples?",
        subject: "DS",
        semester: "3",
        student_name: "Sneha Gupta",
        student_email: "sneha.gupta@email.com"
    },
    {
        title: "Database normalization - 3NF",
        description: "I understand 1NF and 2NF, but I'm having trouble with Third Normal Form (3NF). Can someone explain with an example?",
        subject: "DBMS",
        semester: "4",
        student_name: "Vikram Singh",
        student_email: "vikram.singh@email.com"
    },
    {
        title: "Java inheritance vs composition",
        description: "What's the difference between inheritance and composition in Java? When should I use each approach?",
        subject: "Java",
        semester: "3",
        student_name: "Anjali Reddy",
        student_email: "anjali.reddy@email.com"
    }
];

// Function to add all subjects and sample data
async function addAllSubjectsAndData() {
    try {
        console.log('Adding sample mock tests...');
        
        // Add mock tests
        for (const test of sampleTests) {
            const testResponse = await fetch('/api/mock-tests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(test)
            });
            
            if (testResponse.ok) {
                const testResult = await testResponse.json();
                console.log(`Mock test added: ${test.title}`, testResult);
            } else {
                console.error(`Failed to add mock test: ${test.title}`, await testResponse.text());
            }
        }
        
        console.log('Adding sample doubts...');
        
        // Add sample doubts
        for (const doubt of sampleDoubts) {
            const doubtResponse = await fetch('/api/doubts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(doubt)
            });
            
            if (doubtResponse.ok) {
                const doubtResult = await doubtResponse.json();
                console.log(`Doubt added: ${doubt.title}`, doubtResult);
            } else {
                console.error(`Failed to add doubt: ${doubt.title}`, await doubtResponse.text());
            }
        }
        
        console.log('All subjects and sample data added successfully!');
        console.log('Subjects by semester:');
        Object.entries(subjectsBySemester).forEach(([semester, subjects]) => {
            console.log(`Semester ${semester}: ${subjects.join(', ')}`);
        });
        
        alert('All subjects and sample data have been added successfully!');
        
    } catch (error) {
        console.error('Error adding subjects and data:', error);
        alert('Error adding data. Make sure the server is running.');
    }
}

// Function to display subjects by semester
function displaySubjectsBySemester() {
    console.log('\n=== SUBJECTS BY SEMESTER ===');
    Object.entries(subjectsBySemester).forEach(([semester, subjects]) => {
        console.log(`\nSemester ${semester}:`);
        subjects.forEach(subject => {
            console.log(`  - ${subject}`);
        });
    });
    console.log('\n=============================\n');
}

// Auto-run if this script is loaded in browser
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        // Add a button to the page to load all subjects and data
        const addDataBtn = document.createElement('button');
        addDataBtn.textContent = 'Add All Subjects & Sample Data';
        addDataBtn.className = 'btn btn-primary';
        addDataBtn.style.position = 'fixed';
        addDataBtn.style.bottom = '20px';
        addDataBtn.style.right = '20px';
        addDataBtn.style.zIndex = '9999';
        addDataBtn.style.backgroundColor = '#667eea';
        addDataBtn.style.color = 'white';
        addDataBtn.style.border = 'none';
        addDataBtn.style.padding = '10px 15px';
        addDataBtn.style.borderRadius = '8px';
        addDataBtn.style.cursor = 'pointer';
        addDataBtn.onclick = addAllSubjectsAndData;
        
        document.body.appendChild(addDataBtn);
        
        // Display subjects info
        displaySubjectsBySemester();
    });
}

// Export for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        subjectsBySemester, 
        sampleTests, 
        sampleDoubts, 
        addAllSubjectsAndData,
        displaySubjectsBySemester 
    };
}
