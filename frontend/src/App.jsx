import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Loader from './components/Loader';

import Login from './pages/auth/Login';
import Profile from './pages/shared/Profile';
import Notices from './pages/shared/Notices';

import StudentDashboard from './pages/student/Dashboard';
import StudentAttendance from './pages/student/Attendance';
import StudentMarks from './pages/student/Marks';
import StudentAssignments from './pages/student/Assignments';
import StudentTimetable from './pages/student/Timetable';
import StudentNotes from './pages/student/Notes';
import StudentFees from './pages/student/Fees';
import StudentDocuments from './pages/student/Documents';
import StudentAI from './pages/student/AIStudyTools';

import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherAttendance from './pages/teacher/Attendance';
import TeacherMarks from './pages/teacher/Marks';
import TeacherAssignments from './pages/teacher/Assignments';
import TeacherNotes from './pages/teacher/Notes';
import TeacherAI from './pages/teacher/AITools';

import ParentDashboard from './pages/parent/Dashboard';

import AdminDashboard from './pages/admin/Dashboard';
import AdminStudents from './pages/admin/Students';
import AdminTeachers from './pages/admin/Teachers';
import AdminParents from './pages/admin/Parents';
import AdminAcademics from './pages/admin/Academics';
import AdminTimetable from './pages/admin/TimetableExams';
import AdminFees from './pages/admin/Fees';
import AdminReports from './pages/admin/Reports';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  return <Navigate to={user ? `/${user.role.toLowerCase()}` : '/login'} replace />;
}

const guard = (role) => <ProtectedRoute allowedRoles={[role]}><DashboardLayout /></ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route path="/student" element={guard('STUDENT')}>
        <Route index element={<StudentDashboard />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="marks" element={<StudentMarks />} />
        <Route path="assignments" element={<StudentAssignments />} />
        <Route path="timetable" element={<StudentTimetable />} />
        <Route path="notes" element={<StudentNotes />} />
        <Route path="fees" element={<StudentFees />} />
        <Route path="notices" element={<Notices />} />
        <Route path="documents" element={<StudentDocuments />} />
        <Route path="ai" element={<StudentAI />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="/teacher" element={guard('TEACHER')}>
        <Route index element={<TeacherDashboard />} />
        <Route path="attendance" element={<TeacherAttendance />} />
        <Route path="marks" element={<TeacherMarks />} />
        <Route path="assignments" element={<TeacherAssignments />} />
        <Route path="notes" element={<TeacherNotes />} />
        <Route path="notices" element={<Notices />} />
        <Route path="ai" element={<TeacherAI />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="/parent" element={guard('PARENT')}>
        <Route index element={<ParentDashboard />} />
        <Route path="notices" element={<Notices />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="/admin" element={guard('ADMIN')}>
        <Route index element={<AdminDashboard />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="teachers" element={<AdminTeachers />} />
        <Route path="parents" element={<AdminParents />} />
        <Route path="academics" element={<AdminAcademics />} />
        <Route path="timetable" element={<AdminTimetable />} />
        <Route path="fees" element={<AdminFees />} />
        <Route path="notices" element={<Notices />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
