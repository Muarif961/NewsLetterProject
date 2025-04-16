
import useSWR from "swr";
import type { User, InsertUser } from "db/schema";

export function useUser() {
  const { data, error, mutate } = useSWR<User, Error>("/api/user", {
    revalidateOnFocus: false,
  });

  return {
    user: data,
    isLoading: !error && !data,
    error,
    login: async (user: InsertUser) => {
      const res = await handleRequest("/login", "POST", user);
      if (res.ok && res.user) {
        await mutate(res.user, false);
        
        // Check if this is the first login by looking for a flag in localStorage
        const hasLoggedInBefore = localStorage.getItem('has-logged-in-before');
        
        if (!hasLoggedInBefore) {
          // Mark that this is the first login ever
          localStorage.setItem('has-logged-in-before', 'true');
          // Mark as first time for onboarding
          localStorage.setItem('onboarding-first-time', 'true');
          localStorage.setItem('onboarding-completed', 'false');
        }
      }
      return res;
    },
    logout: async () => {
      const res = await handleRequest("/logout", "POST");
      mutate(undefined);
      return res;
    },
    register: async (user: InsertUser) => {
      const res = await handleRequest("/register", "POST", user);
      if (res.ok && res.user) {
        await mutate(res.user, false);
        
        // For new registrations, always mark as first login
        localStorage.setItem('has-logged-in-before', 'true');
        // Mark as first time for onboarding
        localStorage.setItem('onboarding-first-time', 'true');
        localStorage.setItem('onboarding-completed', 'false');
      }
      return res;
    },
  };
}

type RequestResult =
  | {
      ok: true;
      user?: User;
      message?: string;
    }
  | {
      ok: false;
      message: string;
      errors?: any;
    };

async function handleRequest(
  url: string,
  method: string,
  body?: InsertUser,
): Promise<RequestResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      return { 
        ok: false, 
        message: data.message || "Request failed",
        errors: data.errors
      };
    }

    return {
      ok: true,
      user: data.user,
      message: data.message
    };
  } catch (e: any) {
    return { 
      ok: false, 
      message: e.message || "Network error"
    };
  }
}
