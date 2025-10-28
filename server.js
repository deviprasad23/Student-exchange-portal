const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, JPG, JPEG, PNG files are allowed.'));
        }
    }
});

// Initialize SQLite database
const db = new sqlite3.Database('student_portal.db');
app.set('db', db); // Store db connection on app for access from bin/www

// Create tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        subject TEXT NOT NULL,
        semester TEXT,
        year TEXT,
        description TEXT,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        file_path TEXT NOT NULL,
        file_size INTEGER
    )`);

    // Reviews for uploaded files
    db.run(`CREATE TABLE IF NOT EXISTS file_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        reviewer_name TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS search_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        search_term TEXT NOT NULL,
        search_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        results_count INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS mock_tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        subject TEXT NOT NULL,
        semester TEXT,
        year TEXT,
        description TEXT,
        total_questions INTEGER DEFAULT 0,
        duration_minutes INTEGER DEFAULT 60,
        created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS mock_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        explanation TEXT,
        difficulty_level TEXT DEFAULT 'medium',
        question_order INTEGER DEFAULT 1,
        FOREIGN KEY (test_id) REFERENCES mock_tests (id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS test_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id INTEGER NOT NULL,
        student_name TEXT NOT NULL,
        student_email TEXT,
        score INTEGER DEFAULT 0,
        total_questions INTEGER DEFAULT 0,
        time_taken INTEGER DEFAULT 0,
        answers TEXT,
        attempt_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (test_id) REFERENCES mock_tests (id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS doubts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        subject TEXT NOT NULL,
        semester TEXT,
        student_name TEXT NOT NULL,
        student_email TEXT,
        status TEXT DEFAULT 'open',
        created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_date DATETIME
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS doubt_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doubt_id INTEGER NOT NULL,
        responder_name TEXT NOT NULL,
        responder_email TEXT,
        response_text TEXT NOT NULL,
        is_solution BOOLEAN DEFAULT 0,
        created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (doubt_id) REFERENCES doubts (id) ON DELETE CASCADE
    )`);
});

// Seed chapter-wise mock tests if none exist
function seedMockTestsIfEmpty() {
    const subjectsBySemester = {
        "1": ["M1", "Applied Physics", "PPS-1", "BEE"],
        "2": ["M2", "Chemistry", "English", "PPS-2"],
        "3": ["CS-1", "DS", "Python", "FSE", "P&S", "Java"],
        "4": ["DWV", "DAA", "FAI", "DBMS"],
        "5": ["EML", "CS2", "WPM", "ED"]
    };

    db.get('SELECT COUNT(*) as cnt FROM mock_tests', [], (err, row) => {
        if (err) {
            console.error('Seed check error:', err);
            return;
        }
        if (row && row.cnt > 0) {
            return; // already seeded
        }

        console.log('Seeding chapter-wise mock tests...');

        const insertTest = (testData, questions, done) => {
            const sql = `INSERT INTO mock_tests (title, subject, semester, year, description, total_questions, duration_minutes, is_active)
                         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`;
            db.run(sql, [
                testData.title,
                testData.subject,
                testData.semester,
                testData.year || null,
                testData.description || null,
                questions.length,
                testData.duration_minutes || 20
            ], function(insertErr) {
                if (insertErr) {
                    console.error('Seed insert test error:', insertErr);
                    return done && done(insertErr);
                }
                const testId = this.lastID;
                const qSql = `INSERT INTO mock_questions (test_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty_level, question_order)
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                let idx = 0;
                const insertNext = () => {
                    if (idx >= questions.length) return done && done();
                    const q = questions[idx++];
                    db.run(qSql, [
                        testId,
                        q.question_text,
                        q.option_a,
                        q.option_b,
                        q.option_c,
                        q.option_d,
                        q.correct_answer,
                        q.explanation || null,
                        q.difficulty_level || 'medium',
                        idx
                    ], (qErr) => {
                        if (qErr) console.error('Seed insert question error:', qErr);
                        insertNext();
                    });
                };
                insertNext();
            });
        };

        const topicalBank = {
            'M1': [
                ['Limits: lim x→0 (sin x)/x = ?', '0', '1', 'x', 'Does not exist', 'B'],
                ['Derivatives: d/dx (x^n) = ?', 'nx^(n-1)', 'x^n', 'n^x', 'ln x', 'A'],
                ['Integrals: ∫ x dx = ?', 'x^2', 'x^2/2 + C', '2x + C', 'ln x + C', 'B'],
                ['Continuity: f is continuous at a if?', 'lim f(x)=f(a)', 'f is differentiable', 'f(a)=0', 'f(x)=x', 'A']
            ],
            'Applied Physics': [
                ['Kinematics: Unit of acceleration?', 'm/s', 'm/s^2', 'N', 'kg', 'B'],
                ['Waves: v = fλ, increase f, λ?', 'Increases', 'Decreases', 'Same', 'Zero', 'B'],
                ['Optics: Lens forming real inverted image?', 'Concave', 'Convex', 'Plano', 'Cylindrical', 'B'],
                ['Thermo: Zeroth law defines?', 'Entropy', 'Temperature', 'Work', 'Heat', 'B']
            ],
            'PPS-1': [
                ['C: Which is valid identifier?', '2var', '_count', 'int', 'return', 'B'],
                ['C: Which header for printf?', 'stdlib.h', 'stdio.h', 'string.h', 'math.h', 'B'],
                ['C: Array index starts at?', '0', '1', '-1', 'Depends', 'A'],
                ['C: while loop runs until?', 'Condition true', 'Condition false', 'n times', 'Never', 'A']
            ],
            'BEE': [
                ['Ohm’s Law: V = ?', 'IR', 'I/R', 'R/I', 'I+R', 'A'],
                ['Power: P = ?', 'VI', 'V/I', 'I/V', 'V+I', 'A'],
                ['Series resistors total?', 'Sum', 'Product', 'Average', 'Max', 'A'],
                ['AC frequency (India)?', '50 Hz', '60 Hz', '100 Hz', '10 Hz', 'A']
            ]
        };

        const sampleQuestions = (subject, chapterLabel) => {
            const bank = topicalBank[subject];
            if (bank) {
                // Use first 4 topical entries for each chapter label, tweak text with chapter
                return bank.slice(0, 4).map((b, i) => ({
                    question_text: `[${subject}] ${chapterLabel}: ${b[0]}`,
                    option_a: b[1], option_b: b[2], option_c: b[3], option_d: b[4],
                    correct_answer: b[5], explanation: `${subject} - ${chapterLabel} concept check`,
                    difficulty_level: i < 2 ? 'easy' : 'medium'
                }));
            }
            // Fallback generic
            return [
                {
                    question_text: `[${subject}] ${chapterLabel}: Concept check 1`,
                    option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D',
                    correct_answer: 'A', explanation: 'Sample explanation', difficulty_level: 'easy'
                },
                {
                    question_text: `[${subject}] ${chapterLabel}: Concept check 2`,
                    option_a: 'A1', option_b: 'B1', option_c: 'C1', option_d: 'D1',
                    correct_answer: 'B', explanation: 'Sample explanation', difficulty_level: 'medium'
                },
                {
                    question_text: `[${subject}] ${chapterLabel}: Concept check 3`,
                    option_a: 'True', option_b: 'False', option_c: 'Maybe', option_d: 'Never',
                    correct_answer: 'A', explanation: 'Sample explanation', difficulty_level: 'medium'
                },
                {
                    question_text: `[${subject}] ${chapterLabel}: Concept check 4`,
                    option_a: 'Opt1', option_b: 'Opt2', option_c: 'Opt3', option_d: 'Opt4',
                    correct_answer: 'C', explanation: 'Sample explanation', difficulty_level: 'easy'
                }
            ];
        };

        const tasks = [];
        Object.entries(subjectsBySemester).forEach(([semester, subjects]) => {
            subjects.forEach((subject) => {
                // Two chapter-wise tests per subject
                tasks.push({
                    data: {
                        title: `${subject} - Chapter 1 Basics`,
                        subject,
                        semester,
                        year: '2024',
                        description: `Fundamentals of ${subject} - Chapter 1`,
                        duration_minutes: 20
                    },
                    questions: sampleQuestions(subject, 'Chapter 1')
                });
                tasks.push({
                    data: {
                        title: `${subject} - Chapter 2 Practice`,
                        subject,
                        semester,
                        year: '2024',
                        description: `Practice questions for ${subject} - Chapter 2`,
                        duration_minutes: 25
                    },
                    questions: sampleQuestions(subject, 'Chapter 2')
                });
            });
        });

        let completed = 0;
        tasks.forEach(task => {
            insertTest(task.data, task.questions, () => {
                completed++;
                if (completed === tasks.length) {
                    console.log('Mock tests seeding completed');
                }
            });
        });
    });
}

seedMockTestsIfEmpty();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload file endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { subject, semester, year, description } = req.body;
        
        if (!subject) {
            return res.status(400).json({ error: 'Subject is required' });
        }

        const fileData = {
            filename: req.file.filename,
            original_name: req.file.originalname,
            file_type: path.extname(req.file.originalname).toLowerCase(),
            subject: subject,
            semester: semester || null,
            year: year || null,
            description: description || null,
            file_path: req.file.path,
            file_size: req.file.size
        };

        const sql = `INSERT INTO files (filename, original_name, file_type, subject, semester, year, description, file_path, file_size) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.run(sql, [
            fileData.filename,
            fileData.original_name,
            fileData.file_type,
            fileData.subject,
            fileData.semester,
            fileData.year,
            fileData.description,
            fileData.file_path,
            fileData.file_size
        ], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to save file information' });
            }

            res.json({
                message: 'File uploaded successfully',
                fileId: this.lastID,
                file: fileData
            });
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Search files endpoint
app.get('/search', (req, res) => {
    const { q, subject, semester, year, type } = req.query;
    
    let sql = `SELECT * FROM files WHERE 1=1`;
    const params = [];

    if (q) {
        sql += ` AND (original_name LIKE ? OR subject LIKE ? OR description LIKE ?)`;
        const searchTerm = `%${q}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    if (subject) {
        sql += ` AND subject = ?`;
        params.push(subject);
    }

    if (semester) {
        sql += ` AND semester = ?`;
        params.push(semester);
    }

    if (year) {
        sql += ` AND year = ?`;
        params.push(year);
    }

    if (type) {
        sql += ` AND file_type = ?`;
        params.push(type);
    }

    sql += ` ORDER BY upload_date DESC`;

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Search error:', err);
            return res.status(500).json({ error: 'Search failed' });
        }

        // Log search
        if (q) {
            db.run(`INSERT INTO search_logs (search_term, results_count) VALUES (?, ?)`, [q, rows.length]);
        }

        res.json(rows);
    });
});

// Get all files endpoint
app.get('/files', (req, res) => {
    const sql = `SELECT * FROM files ORDER BY upload_date DESC`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to fetch files' });
        }
        res.json(rows);
    });
});

// Get file by ID
app.get('/files/:id', (req, res) => {
    const { id } = req.params;
    
    db.get(`SELECT * FROM files WHERE id = ?`, [id], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to fetch file' });
        }
       
        if (!row) {
            return res.status(404).json({ error: 'File not found' });
        }
        // Fetch rating summary for this file (average rating and review count)
        db.get(`SELECT AVG(rating) as avg_rating, COUNT(*) as reviews_count FROM file_reviews WHERE file_id = ?`, [id], (err2, stats) => {
            if (err2) {
                console.error('Error fetching review stats:', err2);
                // Return file even if stats query fails
                return res.json(row);
            }

            const avg = stats && stats.avg_rating ? Number(Number(stats.avg_rating).toFixed(2)) : null;
            res.json({
                ...row,
                reviews_count: stats ? stats.reviews_count : 0,
                average_rating: avg
            });
        });
    });
});

// Get reviews for a specific file
app.get('/files/:id/reviews', (req, res) => {
    const { id } = req.params;

    db.all(`SELECT id, file_id, reviewer_name, rating, comment, created_date FROM file_reviews WHERE file_id = ? ORDER BY created_date DESC`, [id], (err, rows) => {
        if (err) {
            console.error('Error fetching reviews:', err);
            return res.status(500).json({ error: 'Failed to fetch reviews' });
        }
        res.json(rows);
    });
});

// Add a review for a specific file
app.post('/files/:id/reviews', (req, res) => {
    const { id } = req.params;
    const { reviewer_name, rating, comment } = req.body;

    if (!reviewer_name || typeof rating === 'undefined') {
        return res.status(400).json({ error: 'Reviewer name and rating are required' });
    }

    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    // Ensure file exists
    db.get(`SELECT id FROM files WHERE id = ?`, [id], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to verify file' });
        }

        if (!row) {
            return res.status(404).json({ error: 'File not found' });
        }

        const sql = `INSERT INTO file_reviews (file_id, reviewer_name, rating, comment) VALUES (?, ?, ?, ?)`;
        db.run(sql, [id, reviewer_name, parsedRating, comment || null], function(err) {
            if (err) {
                console.error('Error saving review:', err);
                return res.status(500).json({ error: 'Failed to save review' });
            }

            // Return the created review
            db.get(`SELECT id, file_id, reviewer_name, rating, comment, created_date FROM file_reviews WHERE id = ?`, [this.lastID], (err2, created) => {
                if (err2) {
                    console.error('Error fetching created review:', err2);
                    return res.json({ message: 'Review created', reviewId: this.lastID });
                }
                res.status(201).json(created);
            });
        });
    });
});

// Download file endpoint
app.get('/download/:id', (req, res) => {
    const { id } = req.params;
    
    db.get(`SELECT * FROM files WHERE id = ?`, [id], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to fetch file' });
        }
        
        if (!row) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        const filePath = path.join(__dirname, row.file_path);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on disk' });
        }
        
        res.download(filePath, row.original_name);
    });
});

// Get subjects endpoint
app.get('/subjects', (req, res) => {
    const sql = `SELECT DISTINCT subject FROM files ORDER BY subject`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to fetch subjects' });
        }
        res.json(rows.map(row => row.subject));
    });
});

// Get statistics endpoint
app.get('/stats', (req, res) => {
    const queries = [
        'SELECT COUNT(*) as total_files FROM files',
        'SELECT COUNT(DISTINCT subject) as total_subjects FROM files',
        'SELECT file_type, COUNT(*) as count FROM files GROUP BY file_type',
        'SELECT subject, COUNT(*) as count FROM files GROUP BY subject ORDER BY count DESC LIMIT 5'
    ];

    Promise.all(queries.map(query => 
        new Promise((resolve, reject) => {
            db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        })
    )).then(results => {
        res.json({
            totalFiles: results[0][0].total_files,
            totalSubjects: results[1][0].total_subjects,
            fileTypes: results[2],
            topSubjects: results[3]
        });
    }).catch(err => {
        console.error('Stats error:', err);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    });
});

// Mock Tests API Endpoints

// Get all mock tests
app.get('/api/mock-tests', (req, res) => {
    const { subject, semester } = req.query;
    
    let sql = `SELECT * FROM mock_tests WHERE is_active = 1`;
    const params = [];
    
    if (subject) {
        sql += ` AND subject = ?`;
        params.push(subject);
    }
    
    if (semester) {
        sql += ` AND semester = ?`;
        params.push(semester);
    }
    
    sql += ` ORDER BY created_date DESC`;
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error fetching mock tests:', err);
            return res.status(500).json({ error: 'Failed to fetch mock tests' });
        }
        res.json(rows);
    });
});

// Get mock test by ID with questions
app.get('/api/mock-tests/:id', (req, res) => {
    const { id } = req.params;
    
    const testQuery = `SELECT * FROM mock_tests WHERE id = ? AND is_active = 1`;
    const questionsQuery = `SELECT * FROM mock_questions WHERE test_id = ? ORDER BY question_order`;
    
    db.get(testQuery, [id], (err, test) => {
        if (err) {
            console.error('Error fetching mock test:', err);
            return res.status(500).json({ error: 'Failed to fetch mock test' });
        }
        
        if (!test) {
            return res.status(404).json({ error: 'Mock test not found' });
        }
        
        db.all(questionsQuery, [id], (err, questions) => {
            if (err) {
                console.error('Error fetching questions:', err);
                return res.status(500).json({ error: 'Failed to fetch questions' });
            }
            
            res.json({
                ...test,
                questions: questions
            });
        });
    });
});

// Create new mock test
app.post('/api/mock-tests', (req, res) => {
    const { title, subject, semester, year, description, duration_minutes, questions } = req.body;
    
    if (!title || !subject) {
        return res.status(400).json({ error: 'Title and subject are required' });
    }
    
    const testData = {
        title,
        subject,
        semester: semester || null,
        year: year || null,
        description: description || null,
        duration_minutes: duration_minutes || 60,
        total_questions: questions ? questions.length : 0
    };
    
    const sql = `INSERT INTO mock_tests (title, subject, semester, year, description, duration_minutes, total_questions) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [
        testData.title,
        testData.subject,
        testData.semester,
        testData.year,
        testData.description,
        testData.duration_minutes,
        testData.total_questions
    ], function(err) {
        if (err) {
            console.error('Error creating mock test:', err);
            return res.status(500).json({ error: 'Failed to create mock test' });
        }
        
        const testId = this.lastID;
        
        // Insert questions if provided
        if (questions && questions.length > 0) {
            const questionSql = `INSERT INTO mock_questions (test_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty_level, question_order) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            
            let completed = 0;
            questions.forEach((question, index) => {
                db.run(questionSql, [
                    testId,
                    question.question_text,
                    question.option_a,
                    question.option_b,
                    question.option_c,
                    question.option_d,
                    question.correct_answer,
                    question.explanation || null,
                    question.difficulty_level || 'medium',
                    index + 1
                ], (err) => {
                    if (err) {
                        console.error('Error inserting question:', err);
                    }
                    completed++;
                    if (completed === questions.length) {
                        res.json({ message: 'Mock test created successfully', testId: testId });
                    }
                });
            });
        } else {
            res.json({ message: 'Mock test created successfully', testId: testId });
        }
    });
});

// Submit test attempt
app.post('/api/mock-tests/:id/attempt', (req, res) => {
    const { id } = req.params;
    const { student_name, student_email, answers, time_taken } = req.body;
    
    if (!student_name || !answers) {
        return res.status(400).json({ error: 'Student name and answers are required' });
    }
    
    // Get test details and calculate score
    const testQuery = `SELECT * FROM mock_tests WHERE id = ?`;
    const questionsQuery = `SELECT * FROM mock_questions WHERE test_id = ? ORDER BY question_order`;
    
    db.get(testQuery, [id], (err, test) => {
        if (err) {
            console.error('Error fetching test:', err);
            return res.status(500).json({ error: 'Failed to fetch test' });
        }
        
        if (!test) {
            return res.status(404).json({ error: 'Test not found' });
        }
        
        db.all(questionsQuery, [id], (err, questions) => {
            if (err) {
                console.error('Error fetching questions:', err);
                return res.status(500).json({ error: 'Failed to fetch questions' });
            }
            
            let score = 0;
            questions.forEach((question, index) => {
                if (answers[index] === question.correct_answer) {
                    score++;
                }
            });
            
            const attemptData = {
                test_id: id,
                student_name,
                student_email: student_email || null,
                score,
                total_questions: questions.length,
                time_taken: time_taken || 0,
                answers: JSON.stringify(answers)
            };
            
            const sql = `INSERT INTO test_attempts (test_id, student_name, student_email, score, total_questions, time_taken, answers) 
                         VALUES (?, ?, ?, ?, ?, ?, ?)`;
            
            db.run(sql, [
                attemptData.test_id,
                attemptData.student_name,
                attemptData.student_email,
                attemptData.score,
                attemptData.total_questions,
                attemptData.time_taken,
                attemptData.answers
            ], function(err) {
                if (err) {
                    console.error('Error saving attempt:', err);
                    return res.status(500).json({ error: 'Failed to save attempt' });
                }
                
                res.json({
                    message: 'Test submitted successfully',
                    attemptId: this.lastID,
                    score: score,
                    totalQuestions: questions.length,
                    percentage: Math.round((score / questions.length) * 100)
                });
            });
        });
    });
});

// Doubt Clarification API Endpoints

// Get all doubts
app.get('/api/doubts', (req, res) => {
    const { subject, status } = req.query;
    
    let sql = `SELECT d.*, COUNT(dr.id) as response_count 
               FROM doubts d 
               LEFT JOIN doubt_responses dr ON d.id = dr.doubt_id 
               WHERE 1=1`;
    const params = [];
    
    if (subject) {
        sql += ` AND d.subject = ?`;
        params.push(subject);
    }
    
    if (status) {
        sql += ` AND d.status = ?`;
        params.push(status);
    }
    
    sql += ` GROUP BY d.id ORDER BY d.created_date DESC`;
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error fetching doubts:', err);
            return res.status(500).json({ error: 'Failed to fetch doubts' });
        }
        res.json(rows);
    });
});

// Get doubt by ID with responses
app.get('/api/doubts/:id', (req, res) => {
    const { id } = req.params;
    
    const doubtQuery = `SELECT * FROM doubts WHERE id = ?`;
    const responsesQuery = `SELECT * FROM doubt_responses WHERE doubt_id = ? ORDER BY created_date ASC`;
    
    db.get(doubtQuery, [id], (err, doubt) => {
        if (err) {
            console.error('Error fetching doubt:', err);
            return res.status(500).json({ error: 'Failed to fetch doubt' });
        }
        
        if (!doubt) {
            return res.status(404).json({ error: 'Doubt not found' });
        }
        
        db.all(responsesQuery, [id], (err, responses) => {
            if (err) {
                console.error('Error fetching responses:', err);
                return res.status(500).json({ error: 'Failed to fetch responses' });
            }
            
            res.json({
                ...doubt,
                responses: responses
            });
        });
    });
});

// Create new doubt
app.post('/api/doubts', (req, res) => {
    const { title, description, subject, semester, student_name, student_email } = req.body;
    
    if (!title || !description || !subject || !student_name) {
        return res.status(400).json({ error: 'Title, description, subject, and student name are required' });
    }
    
    const doubtData = {
        title,
        description,
        subject,
        semester: semester || null,
        student_name,
        student_email: student_email || null
    };
    
    const sql = `INSERT INTO doubts (title, description, subject, semester, student_name, student_email) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [
        doubtData.title,
        doubtData.description,
        doubtData.subject,
        doubtData.semester,
        doubtData.student_name,
        doubtData.student_email
    ], function(err) {
        if (err) {
            console.error('Error creating doubt:', err);
            return res.status(500).json({ error: 'Failed to create doubt' });
        }
        
        res.json({ message: 'Doubt posted successfully', doubtId: this.lastID });
    });
});

// Add response to doubt
app.post('/api/doubts/:id/responses', (req, res) => {
    const { id } = req.params;
    const { responder_name, responder_email, response_text, is_solution } = req.body;
    
    if (!responder_name || !response_text) {
        return res.status(400).json({ error: 'Responder name and response text are required' });
    }
    
    const responseData = {
        doubt_id: id,
        responder_name,
        responder_email: responder_email || null,
        response_text,
        is_solution: is_solution || false
    };
    
    const sql = `INSERT INTO doubt_responses (doubt_id, responder_name, responder_email, response_text, is_solution) 
                 VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [
        responseData.doubt_id,
        responseData.responder_name,
        responseData.responder_email,
        responseData.response_text,
        responseData.is_solution
    ], function(err) {
        if (err) {
            console.error('Error adding response:', err);
            return res.status(500).json({ error: 'Failed to add response' });
        }
        
        // If this is marked as a solution, update the doubt status
        if (is_solution) {
            db.run(`UPDATE doubts SET status = 'resolved', resolved_date = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
        }
        
        res.json({ message: 'Response added successfully', responseId: this.lastID });
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        }
    }
    res.status(500).json({ error: error.message });
});

// Setup graceful shutdown handler
function setupGracefulShutdown(server) {
    process.on('SIGINT', () => {
        console.log('\nShutting down server...');
        server.close(() => {
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('Database connection closed.');
                }
                process.exit(0);
            });
        });
    });
}

// Start server if this file is run directly (not required as a module)
if (require.main === module) {
    const server = app.listen(PORT, () => {
        console.log(`Student Exchange Portal server running on http://localhost:${PORT}`);
    });
    setupGracefulShutdown(server);
}

// Export for use by bin/www or testing
module.exports = app;
