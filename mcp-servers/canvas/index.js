#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

// Canvas API configuration
const CANVAS_API_URL = 'https://canvas.instructure.com/api/v1';
const CANVAS_API_KEY = process.env.CANVAS_API_KEY;

if (!CANVAS_API_KEY) {
  console.error('Error: CANVAS_API_KEY environment variable is required');
  process.exit(1);
}

/**
 * Make a request to Canvas API
 */
async function canvasRequest(endpoint) {
  const url = `${CANVAS_API_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${CANVAS_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Canvas API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Canvas API request failed:', error);
    throw error;
  }
}

/**
 * Get active courses where user is a student
 */
async function getActiveCourses() {
  try {
    const courses = await canvasRequest('/courses?enrollment_state=active&include[]=term&include[]=total_students');
    
    // Filter to only student courses
    const studentCourses = courses.filter(course => {
      return course.enrollments?.some(e => 
        e.enrollment_state === 'active' && 
        (e.type === 'student' || e.role === 'StudentEnrollment')
      );
    });
    
    return studentCourses.map(course => ({
      id: course.id,
      name: course.name,
      course_code: course.course_code,
      enrollment_term_id: course.enrollment_term_id,
    }));
  } catch (error) {
    console.error('Failed to fetch courses:', error);
    return [];
  }
}

/**
 * Get assignments for a course
 */
async function getCourseAssignments(courseId) {
  try {
    const assignments = await canvasRequest(`/courses/${courseId}/assignments`);
    return assignments;
  } catch (error) {
    // Silently skip courses we don't have access to
    if (error.message.includes('403') || error.message.includes('401')) {
      return [];
    }
    console.error(`Failed to fetch assignments for course ${courseId}:`, error);
    return [];
  }
}

/**
 * Get upcoming assignments (next 7 days)
 */
async function getUpcomingAssignments() {
  const courses = await getActiveCourses();
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const allAssignments = [];
  
  for (const course of courses) {
    const assignments = await getCourseAssignments(course.id);
    
    const upcoming = assignments
      .filter(a => {
        if (!a.due_at) return false;
        const dueDate = new Date(a.due_at);
        return dueDate > now && dueDate <= weekFromNow;
      })
      .map(a => ({
        ...a,
        course_name: course.name,
        course_code: course.course_code,
      }));
    
    allAssignments.push(...upcoming);
  }
  
  // Sort by due date
  return allAssignments.sort((a, b) => {
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  });
}

/**
 * Get current assignments (all assignments from active courses)
 */
async function getCurrentAssignments() {
  const courses = await getActiveCourses();
  const allAssignments = [];
  
  for (const course of courses) {
    const assignments = await getCourseAssignments(course.id);
    
    const withCourseInfo = assignments.map(a => ({
      ...a,
      course_name: course.name,
      course_code: course.course_code,
    }));
    
    allAssignments.push(...withCourseInfo);
  }
  
  return allAssignments;
}

// Create MCP server
const server = new Server(
  {
    name: 'canvas-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'canvas://courses/active',
        name: 'Active Courses',
        description: 'List of active courses where you are enrolled as a student',
        mimeType: 'application/json',
      },
      {
        uri: 'canvas://assignments/current',
        name: 'Current Assignments',
        description: 'All assignments from active courses',
        mimeType: 'application/json',
      },
      {
        uri: 'canvas://assignments/upcoming',
        name: 'Upcoming Assignments',
        description: 'Assignments due in the next 7 days',
        mimeType: 'application/json',
      },
    ],
  };
});

// Read resource data
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  let data;
  let description;
  
  switch (uri) {
    case 'canvas://courses/active':
      data = await getActiveCourses();
      description = 'Active courses where you are enrolled as a student';
      break;
      
    case 'canvas://assignments/current':
      data = await getCurrentAssignments();
      description = 'All assignments from active courses';
      break;
      
    case 'canvas://assignments/upcoming':
      data = await getUpcomingAssignments();
      description = 'Assignments due in the next 7 days';
      break;
      
    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
  
  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Canvas MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});

