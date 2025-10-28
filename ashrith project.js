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
        
        res.json(row);
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

// Start server
app.listen(PORT, () => {
    console.log(`Student Exchange Portal server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});
