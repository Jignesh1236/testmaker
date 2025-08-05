# Auto Test Generator

A simple platform to create and share online tests without requiring a database.

## Features

✅ **Easy Test Creation** - Add questions manually or upload via CSV  
✅ **Instant Sharing** - Get unique test links to share with students  
✅ **No Login Required** - Students can take tests without registration  
✅ **Live Results** - Track test attempts and scores in real-time  
✅ **File-Based Storage** - All data saved locally on your computer  

## Data Storage

This application uses **file-based storage** instead of a database. All test data is saved in a `test-data` folder on your computer:

```
project-root/
├── test-data/
│   ├── tests.json      # Test information
│   ├── questions.json  # All questions
│   └── attempts.json   # Student submissions
```

### Benefits of File Storage:
- ✅ No database setup required
- ✅ Easy to backup (just copy the test-data folder)
- ✅ Portable across computers
- ✅ Data remains on your local machine

## How to Use

1. **Start the Application**
   ```bash
   npm run dev
   ```

2. **Create a Test**
   - Click "Create Test" on the homepage
   - Add your test title and duration
   - Add questions one by one or upload a CSV file

3. **Share the Test**
   - After creating, you'll get a unique test link
   - Share this link with your students
   - Students can take the test without any login

4. **View Results**
   - Use the results dashboard link to see live results
   - Track who completed the test and their scores
   - Export results if needed

## CSV Upload Format

For bulk question upload, use this CSV format:

```csv
Question,Option A,Option B,Option C,Option D,Correct Answer,Marks
"What is 2+2?","3","4","5","6","B","1"
"Capital of India?","Delhi","Mumbai","Chennai","Kolkata","A","1"
```

## Backup Your Data

To backup your tests, simply copy the entire `test-data` folder to a safe location. To restore, copy it back to the project root.

---

**Note**: This application runs locally on your computer. All data stays on your machine and is not shared with any external services.