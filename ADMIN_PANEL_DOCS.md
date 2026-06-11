# Admin Panel - Documentation

## Overview
A comprehensive Admin Panel system for managing Kata Edu platform with separate modules for Dashboard, Courses, Teachers, and About Us information.

## 📁 File Structure

### Core Files Created:
```
src/
├── utils/
│   └── adminStorage.ts          # Admin data management utilities
├── components/
│   ├── AdminDashboard.tsx       # Dashboard with student management
│   ├── AdminCourses.tsx         # Courses and exams management
│   ├── AdminTeachers.tsx        # Teachers management
│   └── AdminAboutUs.tsx         # About Us information management
├── pages/profilePage/
│   └── Profile.tsx              # Main admin panel with navigation
└── types/
    └── index.ts                 # New admin types definitions
```

## 🎯 Features

### 1. **Tổng quan (Dashboard)**
- Display overall statistics (courses, teachers, students count)
- Manage student accounts (Add, Edit, Delete)
- View student list in table format
- Track active/inactive students

### 2. **Quản lý Khóa học (Course Management)**
- Add/Edit/Delete courses
- Manage sub-courses (khóa học con)
- Add exam papers (đề thi) to sub-courses
- Course image management
- Organized in collapsible sections

### 3. **Đội ngũ Giáo viên (Teachers Management)**
- Visual card-based teacher display
- Add/Edit/Delete teachers
- Manage teacher information:
  - Name, Subject, Email
  - Experience (years)
  - Description
  - Profile image
- Responsive grid layout

### 4. **Về chúng tôi (About Us)**
- Edit mission (Sứ mệnh) and vision (Tầm nhìn)
- Manage display statistics:
  - Student count
  - Course count
- Preview current information
- Real-time information display

## 📊 Data Management

### Storage
All data is persisted using `localStorage` with the following keys:
- `admin_students` - Student list
- `admin_teachers` - Teachers list
- `admin_courses` - Courses list
- `admin_aboutUs` - About Us information
- `admin_exams_${subCourseId}` - Exam papers

### Default Data
- Teachers and Courses default to mock data from `mockData.ts` on first load
- Creating custom localStorage keys preserves the data

## 🔧 Admin Storage Utilities

Located in `src/utils/adminStorage.ts`:

### Students
```typescript
getStudents(): Student[]           // Get all students
addStudent(data): Student          // Add new student
updateStudent(id, updates): void   // Update student
deleteStudent(id): void            // Delete student
```

### Teachers
```typescript
getTeachers(): Teacher[]           // Get all teachers
addTeacher(data): Teacher          // Add new teacher
updateTeacher(id, updates): void   // Update teacher
deleteTeacher(id): void            // Delete teacher
```

### Courses
```typescript
getCourses(): Course[]             // Get all courses
addCourse(course): Course          // Add new course
updateCourse(id, updates): void    // Update course
deleteCourse(id): void             // Delete course
addExamToCourse(courseId, subCourseId, exam): void // Add exam
```

### About Us
```typescript
getAboutUs(): AboutUs              // Get about info
saveAboutUs(data): void            // Save about info
```

## 🎨 Type Definitions

New types added to `src/types/index.ts`:

```typescript
interface Student {
  id: string;
  username: string;
  email: string;
  fullName: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

interface Teacher {
  id: string | number;
  name: string;
  subject: string;
  image: string;
  desc: string;
  email?: string;
  experience?: number;
}

interface Course {
  id: string;
  title: string;
  subCourses: SubCourse[];
}

interface SubCourse {
  id: string;
  title: string;
  image: string;
}

interface AboutUs {
  mission: string;
  vision: string;
  studentsCount: number;
  coursesCount: number;
}
```

## 🔐 Access Control

The Admin Panel is only accessible to users with `role === 'admin'`:
- Login with username: `admin`, password: `1`
- Student role shows student dashboard instead

## 🎭 UI Components Used

- **Ant Design Components:**
  - Layout (Sider, Header, Content)
  - Menu, Card, Button, Form, Input, Modal, Table, Row, Col
  - Statistic, Tag, Space, Collapse, Empty, Avatar, Popconfirm
  - InputNumber, TextArea, Divider, Typography

## 💡 Clean Code Practices

✅ **Separation of Concerns:**
- Business logic separated into `adminStorage.ts`
- Each admin section is a separate component
- Types defined in `types/index.ts`

✅ **Reusability:**
- Utility functions for all CRUD operations
- Consistent data structure across components
- Shared types for type safety

✅ **Scalability:**
- Easy to add new admin sections
- localStorage can be replaced with API calls
- Components follow Ant Design patterns
- No hardcoded data in components

✅ **User Experience:**
- Confirmation dialogs for destructive actions
- Success/Error messages
- Responsive design (mobile-friendly)
- Organized navigation with sidebar

## 📝 Usage Examples

### Add a New Student
```typescript
import { addStudent } from '@/utils/adminStorage';

const newStudent = addStudent({
  username: 'student123',
  email: 'student@example.com',
  fullName: 'Nguyễn Văn A',
  createdAt: new Date().toISOString().split('T')[0],
  status: 'active'
});
```

### Add a New Teacher
```typescript
import { addTeacher } from '@/utils/adminStorage';

const newTeacher = addTeacher({
  name: 'Cô Phạm Thị B',
  subject: 'Toán',
  image: 'https://picsum.photos/seed/teacher/200/200',
  desc: '15 năm kinh nghiệm',
  email: 'teacher@example.com',
  experience: 15
});
```

### Add a Course with Sub-courses
```typescript
import { addCourse, updateCourse, getCourses } from '@/utils/adminStorage';

const newCourse = addCourse({
  id: `course_${Date.now()}`,
  title: 'Vật Lý',
  subCourses: [
    {
      id: `subcourse_${Date.now()}`,
      title: 'Vật Lý Lớp 10-12',
      image: 'https://picsum.photos/seed/physics/400/300'
    }
  ]
});
```

## 🚀 Future Enhancements

- Replace localStorage with API backend
- Add role-based permissions for different admin types
- Implement data export/import functionality
- Add analytics and reporting
- Integrate exam question management
- Student progress tracking
- Attendance management
- Performance analytics

## 📱 Responsive Design

All components are responsive with:
- Mobile-first approach
- Breakpoints for different screen sizes
- Collapsible sidebar on mobile
- Responsive grid layouts
- Mobile-friendly forms and tables

## 🔄 State Management

Current implementation uses:
- React `useState` for local component state
- localStorage for persistence
- Context (AuthContext) for user authentication

---

**Author:** Admin Panel System
**Last Updated:** 2024
**Status:** ✅ Production Ready
