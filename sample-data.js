// Sample data for testing the Student Exchange Portal
// Run this script to add sample mock tests and doubts

const sampleMockTest = {
    title: "Mathematics - Calculus Fundamentals",
    subject: "Mathematics",
    semester: "1",
    year: "2024",
    description: "Basic calculus concepts including limits, derivatives, and integrals",
    duration_minutes: 30,
    questions: [
        {
            question_text: "What is the derivative of x²?",
            option_a: "x",
            option_b: "2x",
            option_c: "x²",
            option_d: "2x²",
            correct_answer: "B",
            explanation: "The derivative of x² is 2x using the power rule: d/dx(x^n) = nx^(n-1)",
            difficulty_level: "easy"
        },
        {
            question_text: "What is the limit of (x² - 1)/(x - 1) as x approaches 1?",
            option_a: "0",
            option_b: "1",
            option_c: "2",
            option_d: "undefined",
            correct_answer: "C",
            explanation: "Using L'Hôpital's rule or factoring: (x² - 1)/(x - 1) = (x + 1)(x - 1)/(x - 1) = x + 1, so the limit is 2",
            difficulty_level: "medium"
        },
        {
            question_text: "Which of the following is the integral of 1/x?",
            option_a: "ln|x| + C",
            option_b: "x + C",
            option_c: "1/x² + C",
            option_d: "x²/2 + C",
            correct_answer: "A",
            explanation: "The integral of 1/x is ln|x| + C, where C is the constant of integration",
            difficulty_level: "medium"
        },
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
            question_text: "If f(x) = x³ - 3x² + 2x, what is f'(x)?",
            option_a: "3x² - 6x + 2",
            option_b: "3x² - 6x",
            option_c: "x² - 3x + 2",
            option_d: "3x² + 2",
            correct_answer: "A",
            explanation: "Using the power rule: f'(x) = 3x² - 6x + 2",
            difficulty_level: "medium"
        }
    ]
};

const sampleDoubts = [
    {
        title: "How to solve integration by parts?",
        description: "I'm struggling with integration by parts. Can someone explain the formula and provide a step-by-step example? I understand the formula is ∫u dv = uv - ∫v du, but I'm not sure how to choose u and dv.",
        subject: "Mathematics",
        semester: "2",
        student_name: "Alex Johnson",
        student_email: "alex.johnson@email.com"
    },
    {
        title: "Difference between vectors and scalars?",
        description: "What's the fundamental difference between vectors and scalars in physics? I know vectors have magnitude and direction, but I'm confused about when to use each one in problems.",
        subject: "Physics",
        semester: "1",
        student_name: "Sarah Wilson",
        student_email: "sarah.wilson@email.com"
    },
    {
        title: "Understanding recursion in programming",
        description: "I'm learning recursion in my programming class but finding it difficult to understand. Can someone explain the concept with a simple example? How do I know when to use recursion vs iteration?",
        subject: "Computer Science",
        semester: "3",
        student_name: "Mike Chen",
        student_email: "mike.chen@email.com"
    }
];

// Function to add sample data
async function addSampleData() {
    try {
        console.log('Adding sample mock test...');
        
        // Add mock test
        const testResponse = await fetch('/api/mock-tests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sampleMockTest)
        });
        
        if (testResponse.ok) {
            const testResult = await testResponse.json();
            console.log('Mock test added successfully:', testResult);
        } else {
            console.error('Failed to add mock test:', await testResponse.text());
        }
        
        // Add sample doubts
        console.log('Adding sample doubts...');
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
                console.log('Doubt added successfully:', doubtResult);
            } else {
                console.error('Failed to add doubt:', await doubtResponse.text());
            }
        }
        
        console.log('Sample data added successfully!');
        alert('Sample data has been added to your Student Exchange Portal!');
        
    } catch (error) {
        console.error('Error adding sample data:', error);
        alert('Error adding sample data. Make sure the server is running.');
    }
}

// Auto-run if this script is loaded in browser
if (typeof window !== 'undefined') {
    // Add a button to the page to load sample data
    document.addEventListener('DOMContentLoaded', function() {
        const sampleDataBtn = document.createElement('button');
        sampleDataBtn.textContent = 'Load Sample Data';
        sampleDataBtn.className = 'btn btn-outline';
        sampleDataBtn.style.position = 'fixed';
        sampleDataBtn.style.bottom = '20px';
        sampleDataBtn.style.right = '20px';
        sampleDataBtn.style.zIndex = '9999';
        sampleDataBtn.onclick = addSampleData;
        
        document.body.appendChild(sampleDataBtn);
    });
}

// Export for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { sampleMockTest, sampleDoubts, addSampleData };
}
