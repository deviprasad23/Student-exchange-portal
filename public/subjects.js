// Subject reference for all semesters
const SUBJECTS_BY_SEMESTER = {
    "1": [
        "M1",
        "Applied Physics", 
        "PPS-1",
        "BEE"
    ],
    "2": [
        "M2",
        "Chemistry",
        "English", 
        "PPS-2"
    ],
    "3": [
        "CS-1",
        "DS",
        "Python",
        "FSE",
        "P&S",
        "Java"
    ],
    "4": [
        "DWV",
        "DAA", 
        "FAI",
        "DBMS"
    ],
    "5": [
        "EML",
        "CS2",
        "WPM",
        "ED"
    ]
};

// Get all subjects as a flat array
const ALL_SUBJECTS = Object.values(SUBJECTS_BY_SEMESTER).flat();

// Get subjects for a specific semester
function getSubjectsForSemester(semester) {
    return SUBJECTS_BY_SEMESTER[semester] || [];
}

// Get semester for a specific subject
function getSemesterForSubject(subject) {
    for (const [semester, subjects] of Object.entries(SUBJECTS_BY_SEMESTER)) {
        if (subjects.includes(subject)) {
            return semester;
        }
    }
    return null;
}

// Check if a subject exists
function isValidSubject(subject) {
    return ALL_SUBJECTS.includes(subject);
}

// Get all semesters
function getAllSemesters() {
    return Object.keys(SUBJECTS_BY_SEMESTER);
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.SUBJECTS_BY_SEMESTER = SUBJECTS_BY_SEMESTER;
    window.ALL_SUBJECTS = ALL_SUBJECTS;
    window.getSubjectsForSemester = getSubjectsForSemester;
    window.getSemesterForSubject = getSemesterForSubject;
    window.isValidSubject = isValidSubject;
    window.getAllSemesters = getAllSemesters;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUBJECTS_BY_SEMESTER,
        ALL_SUBJECTS,
        getSubjectsForSemester,
        getSemesterForSubject,
        isValidSubject,
        getAllSemesters
    };
}
