import { Router } from 'express';
import { db } from '../db';
import { subscriber_groups, subscriber_group_members, subscribers } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { NotificationService } from '../lib/notifications';

const router = Router();

// List all groups for the current user
router.get('/', async (req, res) => {
  try {
    const groups = await db
      .select()
      .from(subscriber_groups)
      .where(eq(subscriber_groups.userId, req.user!.id))
      .orderBy(subscriber_groups.createdAt);

    res.json(groups);
  } catch (error: any) {
    console.error('Failed to fetch subscriber groups:', error);
    res.status(500).json({ message: 'Failed to fetch subscriber groups' });
  }
});

// Create a new group
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const [group] = await db
      .insert(subscriber_groups)
      .values({
        userId: req.user!.id,
        name,
      })
      .returning();

    await NotificationService.createNotification(
      req.user!.id,
      'group',
      'Group created',
      `New subscriber group "${name}" has been created`
    );

    res.status(201).json(group);
  } catch (error: any) {
    console.error('Failed to create subscriber group:', error);
    res.status(500).json({ message: 'Failed to create subscriber group' });
  }
});

// Update a group
router.put('/:id', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const { name } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    // Check if group exists and belongs to user
    const [existingGroup] = await db
      .select()
      .from(subscriber_groups)
      .where(
        and(
          eq(subscriber_groups.id, groupId),
          eq(subscriber_groups.userId, req.user!.id)
        )
      );

    if (!existingGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const [updated] = await db
      .update(subscriber_groups)
      .set({
        name,
        updatedAt: new Date(),
      })
      .where(eq(subscriber_groups.id, groupId))
      .returning();

    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update subscriber group:', error);
    res.status(500).json({ message: 'Failed to update subscriber group' });
  }
});

// Delete a group
router.delete('/:id', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);

    // Check if group exists and belongs to user
    const [group] = await db
      .select()
      .from(subscriber_groups)
      .where(
        and(
          eq(subscriber_groups.id, groupId),
          eq(subscriber_groups.userId, req.user!.id)
        )
      );

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Delete group (this will cascade delete members due to ON DELETE CASCADE)
    await db
      .delete(subscriber_groups)
      .where(eq(subscriber_groups.id, groupId));

    await NotificationService.createNotification(
      req.user!.id,
      'group',
      'Group deleted',
      `Subscriber group "${group.name}" has been deleted`
    );

    res.json({ message: 'Group deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete subscriber group:', error);
    res.status(500).json({ message: 'Failed to delete subscriber group' });
  }
});

// Add subscribers to a group
router.post('/:id/members', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const { subscriberIds } = req.body;

    if (!Array.isArray(subscriberIds) || subscriberIds.length === 0) {
      return res.status(400).json({ message: 'No subscribers selected' });
    }

    // Verify group exists and belongs to user
    const [group] = await db
      .select()
      .from(subscriber_groups)
      .where(
        and(
          eq(subscriber_groups.id, groupId),
          eq(subscriber_groups.userId, req.user!.id)
        )
      );

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Verify all subscribers belong to the user
    const userSubscribers = await db
      .select()
      .from(subscribers)
      .where(
        and(
          eq(subscribers.userId, req.user!.id)
        )
      );

    const validSubscriberIds = new Set(userSubscribers.map(s => s.id));
    const invalidIds = subscriberIds.filter(id => !validSubscriberIds.has(id));

    if (invalidIds.length > 0) {
      return res.status(400).json({
        message: 'One or more subscribers are invalid or do not belong to you'
      });
    }

    // Add subscribers to group
    const memberships = subscriberIds.map(subscriberId => ({
      groupId,
      subscriberId,
    }));

    await db
      .insert(subscriber_group_members)
      .values(memberships)
      .onConflictDoNothing();

    await NotificationService.createNotification(
      req.user!.id,
      'group',
      'Members added to group',
      `${subscriberIds.length} subscribers added to "${group.name}"`
    );

    res.json({
      message: `${subscriberIds.length} subscribers added to the group`
    });
  } catch (error: any) {
    console.error('Failed to add subscribers to group:', error);
    res.status(500).json({ message: 'Failed to add subscribers to group' });
  }
});

// Remove subscribers from a group
router.delete('/:id/members', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const { subscriberIds } = req.body;

    if (!Array.isArray(subscriberIds) || subscriberIds.length === 0) {
      return res.status(400).json({ message: 'No subscribers selected' });
    }

    // Verify group exists and belongs to user
    const [group] = await db
      .select()
      .from(subscriber_groups)
      .where(
        and(
          eq(subscriber_groups.id, groupId),
          eq(subscriber_groups.userId, req.user!.id)
        )
      );

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Remove subscribers from group
    await db
      .delete(subscriber_group_members)
      .where(
        and(
          eq(subscriber_group_members.groupId, groupId),
          sql`${subscriber_group_members.subscriberId} = ANY(${subscriberIds})`
        )
      );

    await NotificationService.createNotification(
      req.user!.id,
      'group',
      'Members removed from group',
      `${subscriberIds.length} subscribers removed from "${group.name}"`
    );

    res.json({
      message: `${subscriberIds.length} subscribers removed from the group`
    });
  } catch (error: any) {
    console.error('Failed to remove subscribers from group:', error);
    res.status(500).json({ message: 'Failed to remove subscribers from group' });
  }
});

// List members of a group
router.get('/:id/members', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);

    // Verify group exists and belongs to user
    const [group] = await db
      .select()
      .from(subscriber_groups)
      .where(
        and(
          eq(subscriber_groups.id, groupId),
          eq(subscriber_groups.userId, req.user!.id)
        )
      );

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Get all members of the group
    const members = await db
      .select({
        id: subscribers.id,
        email: subscribers.email,
        name: subscribers.name,
        active: subscribers.active,
        createdAt: subscribers.createdAt,
      })
      .from(subscriber_group_members)
      .innerJoin(
        subscribers,
        eq(subscriber_group_members.subscriberId, subscribers.id)
      )
      .where(eq(subscriber_group_members.groupId, groupId));

    res.json(members);
  } catch (error: any) {
    console.error('Failed to fetch group members:', error);
    res.status(500).json({ message: 'Failed to fetch group members' });
  }
});

export default router;