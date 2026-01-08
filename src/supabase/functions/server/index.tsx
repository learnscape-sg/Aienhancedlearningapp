import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Helper function to get user from access token
async function getUserFromToken(authorization: string | null) {
  try {
    if (!authorization?.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authorization.split(' ')[1];
    
    // Skip auth check if using anon key for signup
    if (token === Deno.env.get('SUPABASE_ANON_KEY')) {
      return null;
    }
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.log('Auth error:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.log('Error in getUserFromToken:', error);
    return null;
  }
}

// Health check endpoint
app.get("/make-server-82343da6/health", (c) => {
  return c.json({ status: "ok" });
});

// Auth endpoints
app.post("/make-server-82343da6/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });
    
    if (error) {
      console.log('Signup error:', error);
      return c.json({ error: error.message }, 400);
    }
    
    // Create user profile in KV store
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email: data.user.email,
      name,
      grade: '',
      interests: [],
      role: 'student',
      created_at: new Date().toISOString()
    });
    
    return c.json({ user: data.user });
  } catch (error) {
    console.log('Signup error:', error);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

// User profile endpoints
app.get("/make-server-82343da6/profile", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const profile = await kv.get(`user:${user.id}`);
    return c.json({ profile });
  } catch (error) {
    console.log('Get profile error:', error);
    return c.json({ error: 'Failed to get profile' }, 500);
  }
});

app.put("/make-server-82343da6/profile", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const updates = await c.req.json();
    const currentProfile = await kv.get(`user:${user.id}`) || {};
    
    const updatedProfile = {
      ...currentProfile,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    await kv.set(`user:${user.id}`, updatedProfile);
    return c.json({ profile: updatedProfile });
  } catch (error) {
    console.log('Update profile error:', error);
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

// Learning progress endpoints
app.get("/make-server-82343da6/progress", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const progress = await kv.getByPrefix(`progress:${user.id}:`);
    return c.json({ progress });
  } catch (error) {
    console.log('Get progress error:', error);
    return c.json({ error: 'Failed to get progress' }, 500);
  }
});

app.post("/make-server-82343da6/progress", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { chapterId, progress, completed, timeSpent } = await c.req.json();
    
    const progressData = {
      userId: user.id,
      chapterId,
      progress,
      completed,
      timeSpent,
      updated_at: new Date().toISOString()
    };
    
    await kv.set(`progress:${user.id}:${chapterId}`, progressData);
    return c.json({ success: true });
  } catch (error) {
    console.log('Update progress error:', error);
    return c.json({ error: 'Failed to update progress' }, 500);
  }
});

// Quiz results endpoints
app.post("/make-server-82343da6/quiz-result", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { chapterId, score, answers, timeSpent } = await c.req.json();
    
    const quizResult = {
      userId: user.id,
      chapterId,
      score,
      answers,
      timeSpent,
      completed_at: new Date().toISOString()
    };
    
    const resultId = `quiz:${user.id}:${chapterId}:${Date.now()}`;
    await kv.set(resultId, quizResult);
    
    return c.json({ success: true, resultId });
  } catch (error) {
    console.log('Save quiz result error:', error);
    return c.json({ error: 'Failed to save quiz result' }, 500);
  }
});

app.get("/make-server-82343da6/quiz-results", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const results = await kv.getByPrefix(`quiz:${user.id}:`);
    return c.json({ results });
  } catch (error) {
    console.log('Get quiz results error:', error);
    return c.json({ error: 'Failed to get quiz results' }, 500);
  }
});

// Learning analytics endpoint
app.get("/make-server-82343da6/analytics", async (c) => {
  try {
    const user = await getUserFromToken(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const [progress, quizResults] = await Promise.all([
      kv.getByPrefix(`progress:${user.id}:`),
      kv.getByPrefix(`quiz:${user.id}:`)
    ]);
    
    // Calculate analytics
    const totalChapters = progress.length;
    const completedChapters = progress.filter((p: any) => p.completed).length;
    const totalTimeSpent = progress.reduce((sum: number, p: any) => sum + (p.timeSpent || 0), 0);
    const averageScore = quizResults.length > 0 
      ? quizResults.reduce((sum: number, r: any) => sum + r.score, 0) / quizResults.length 
      : 0;
    
    const analytics = {
      totalChapters,
      completedChapters,
      totalTimeSpent,
      averageScore,
      recentQuizzes: quizResults.slice(-10).reverse(),
      weeklyProgress: progress.slice(-7)
    };
    
    return c.json({ analytics });
  } catch (error) {
    console.log('Get analytics error:', error);
    return c.json({ error: 'Failed to get analytics' }, 500);
  }
});

Deno.serve(app.fetch);