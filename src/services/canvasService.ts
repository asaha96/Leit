/**
 * Simplified Canvas LMS Service
 * Fetches only: Active Courses, Current Assignments, Upcoming Assignments
 */

const CANVAS_API_URL = '/api/canvas';

export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
}

export interface CanvasAssignment {
  id: number;
  name: string;
  description: string;
  due_at?: string;
  points_possible: number;
  course_id: number;
  course_name?: string;
  course_code?: string;
}

export interface CanvasData {
  activeCourses: CanvasCourse[];
  currentAssignments: CanvasAssignment[];
  upcomingAssignments: CanvasAssignment[];
}

class CanvasService {
  /**
   * Make a request to Canvas API via proxy
   */
  private async makeRequest<T>(endpoint: string): Promise<T> {
    const url = `${CANVAS_API_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Don't throw on errors, just return empty array
        console.warn(`Canvas API returned ${response.status} for ${endpoint}`);
        return [] as T;
      }

      return await response.json();
    } catch (error) {
      console.warn('Canvas API request failed:', error);
      return [] as T;
    }
  }

  /**
   * Get active courses where user is enrolled as a student
   */
  async getActiveCourses(): Promise<CanvasCourse[]> {
    try {
      const courses = await this.makeRequest<any[]>('/courses?enrollment_state=active&include[]=term');
      
      // Filter to student courses only and simplify
      return courses
        .filter(c => c.enrollments?.some((e: any) => 
          e.enrollment_state === 'active' && 
          (e.type === 'student' || e.role === 'StudentEnrollment')
        ))
        .map(c => ({
          id: c.id,
          name: c.name,
          course_code: c.course_code,
        }));
    } catch (error) {
      console.error('Failed to fetch active courses:', error);
      return [];
    }
  }

  /**
   * Get assignments for a specific course
   */
  private async getCourseAssignments(courseId: number, courseName: string, courseCode: string): Promise<CanvasAssignment[]> {
    try {
      const assignments = await this.makeRequest<any[]>(`/courses/${courseId}/assignments`);
      
      // Add course info to each assignment
      return assignments.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description || '',
        due_at: a.due_at,
        points_possible: a.points_possible || 0,
        course_id: courseId,
        course_name: courseName,
        course_code: courseCode,
      }));
    } catch (error) {
      // Silently skip courses we can't access
      return [];
    }
  }

  /**
   * Get all current assignments from active courses
   */
  async getCurrentAssignments(): Promise<CanvasAssignment[]> {
    try {
      const courses = await this.getActiveCourses();
      const allAssignments: CanvasAssignment[] = [];
      
      // Fetch assignments for each course sequentially to avoid rate limits
      for (const course of courses) {
        const assignments = await this.getCourseAssignments(course.id, course.name, course.course_code);
        allAssignments.push(...assignments);
      }
      
      return allAssignments;
    } catch (error) {
      console.error('Failed to fetch current assignments:', error);
      return [];
    }
  }

  /**
   * Get upcoming assignments (due in next 7 days)
   */
  async getUpcomingAssignments(): Promise<CanvasAssignment[]> {
    try {
      const allAssignments = await this.getCurrentAssignments();
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      return allAssignments
        .filter(a => {
          if (!a.due_at) return false;
          const dueDate = new Date(a.due_at);
          return dueDate > now && dueDate <= weekFromNow;
        })
        .sort((a, b) => {
          const dateA = new Date(a.due_at!).getTime();
          const dateB = new Date(b.due_at!).getTime();
          return dateA - dateB;
        });
    } catch (error) {
      console.error('Failed to fetch upcoming assignments:', error);
      return [];
    }
  }

  /**
   * Get all Canvas data needed for dashboard
   */
  async getAllData(): Promise<CanvasData> {
    try {
      const activeCourses = await this.getActiveCourses();
      console.log('Fetched active courses:', activeCourses.length);
      
      const currentAssignments = await this.getCurrentAssignments();
      console.log('Fetched current assignments:', currentAssignments.length);
      
      const upcomingAssignments = await this.getUpcomingAssignments();
      console.log('Fetched upcoming assignments:', upcomingAssignments.length);
      
      return {
        activeCourses,
        currentAssignments,
        upcomingAssignments,
      };
    } catch (error) {
      console.error('Failed to fetch Canvas data:', error);
      return {
        activeCourses: [],
        currentAssignments: [],
        upcomingAssignments: [],
      };
    }
  }

  /**
   * Check if Canvas API is configured
   */
  isConfigured(): boolean {
    return true; // Proxy handles this
  }
}

export const canvasService = new CanvasService();
