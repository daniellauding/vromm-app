import { createClient } from 'npm:@supabase/supabase-js@2';

interface Route {
  id: string;
  name: string;
  description?: string;
  creator_id: string;
  created_at: string;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: Route;
  schema: 'public';
  old_record: null | Route;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const route = payload.record;
    const creatorId = route.creator_id;
    // Get all followers of the route creator
    const { data: followers, error: followersError } = await supabase
      .from('user_follows')
      .select('follower_id')
      .eq('following_id', creatorId);
    if (followersError) {
      console.error('Error fetching followers:', followersError);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch followers',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 500,
        },
      );
    }
    if (!followers || followers.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No followers found',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 200,
        },
      );
    }
    // Get expo push tokens for all followers
    const followerIds = followers.map((f) => f.follower_id);
    const { data: tokens, error: tokensError } = await supabase
      .from('user_push_tokens')
      .select('token')
      .in('user_id', followerIds);
    if (tokensError) {
      console.error('Error fetching push tokens:', tokensError);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch push tokens',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 500,
        },
      );
    }
    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No push tokens found for followers',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 200,
        },
      );
    }
    // Send push notifications to all followers
    const pushTokens = tokens.map((t) => t.token);
    const notificationBody = `New route "${route.name}" has been created!`;
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}`,
      },
      body: JSON.stringify({
        to: pushTokens,
        sound: 'default',
        title: 'New Route Created',
        body: notificationBody,
        data: {
          routeId: route.id,
          creatorId: creatorId,
          type: 'route_created',
        },
      }),
    });
    const result = await res.json();
    return new Response(
      JSON.stringify({
        message: `Notifications sent to ${pushTokens.length} followers`,
        result,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in route-created-notification:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 500,
      },
    );
  }
});
