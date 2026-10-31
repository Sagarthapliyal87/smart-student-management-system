import { NavLink } from 'react-router-dom';

const NAV = {
  STUDENT: [
    ['/student', 'Dashboard', '🏠', true], ['/student/attendance', 'Attendance', '📅'], ['/student/marks', 'Marks', '📊'],
    ['/student/assignments', 'Assignments', '📝'], ['/student/timetable', 'Timetable', '🗓️'], ['/student/notes', 'Notes', '📚'],
    ['/student/fees', 'Fees', '💰'], ['/student/notices', 'Notices', '🔔'], ['/student/documents', 'Documents', '📁'],
    ['/student/ai', 'AI Study Tools', '🤖'], ['/student/profile', 'Profile', '👤'],
  ],
  TEACHER: [
    ['/teacher', 'Dashboard', '🏠', true], ['/teacher/attendance', 'Mark Attendance', '📅'], ['/teacher/marks', 'Enter Marks', '📊'],
    ['/teacher/assignments', 'Assignments', '📝'], ['/teacher/notes', 'Study Material', '📚'], ['/teacher/notices', 'Notices', '🔔'],
    ['/teacher/ai', 'AI Tools', '🤖'], ['/teacher/profile', 'Profile', '👤'],
  ],
  PARENT: [['/parent', 'Dashboard', '🏠', true], ['/parent/notices', 'Notices', '🔔'], ['/parent/profile', 'Profile', '👤']],
  ADMIN: [
    ['/admin', 'Dashboard', '🏠', true], ['/admin/students', 'Students', '🎓'], ['/admin/teachers', 'Teachers', '👨‍🏫'],
    ['/admin/parents', 'Parents', '👪'], ['/admin/academics', 'Courses & Classes', '🏛️'], ['/admin/timetable', 'Timetable & Exams', '🗓️'],
    ['/admin/fees', 'Fees', '💰'], ['/admin/notices', 'Notices', '🔔'], ['/admin/reports', 'Reports', '📈'], ['/admin/profile', 'Profile', '👤'],
  ],
};

export default function Sidebar({ role, mobileOpen, onClose }) {
  return (
    <>
      {mobileOpen && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={onClose} />}
      <aside className={`fixed md:static top-0 left-0 z-40 h-full w-64 bg-white border-r border-gray-100 flex flex-col transform transition-transform md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-5 py-5 border-b border-gray-100">
          <p className="font-bold text-brand-700 leading-tight">Smart SMS</p>
          <p className="text-xs text-gray-400">College Management · {role?.charAt(0) + role?.slice(1).toLowerCase()}</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {(NAV[role] || []).map(([to, label, icon, end]) => (
            <NavLink key={to} to={to} end={end} onClick={onClose}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors ${isActive ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
              <span>{icon}</span>{label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
