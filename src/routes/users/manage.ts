import httpErrors from 'http-errors';

import middyfy from '../../middleware';
import { HTTPRawHandler } from '../handler';
import { createUser, deleteUser, getAllUsers, getUser, updateUser } from '../../models/user';
import { deleteAvailability } from '../../models/availability';
import { generateRandomAlphanumeric, hashPassword } from '../../utils/auth';
import { User, UserWithoutPassword } from '../../models/user.d';

/**
 * Manage users: CRUD
 */
const _handler: HTTPRawHandler<
  {
    action: 'GET' | 'CREATE' | 'UPDATE' | 'DELETE';
    targetEmail: string;
    userPayload: Partial<User>;
  },
  {},
  {},
  {
    user: UserWithoutPassword[] | UserWithoutPassword | User;
  }
> = async (event) => {
  const { action, targetEmail: targetEmailRaw, userPayload } = event.body;
  const targetEmail = (targetEmailRaw ?? '').toLowerCase();

  if (
    !(
      event.middleware.override ||
      (event.middleware.authorized &&
        (event.middleware.user.admin ||
          action === 'GET' ||
          (action === 'UPDATE' && targetEmail === event.middleware.user.email)))
    )
  ) {
    // User not authorized or attempting to edit someone else and isn't an admin
    throw new httpErrors.Unauthorized('Not authorized');
  }

  if (!targetEmail && action !== 'GET') {
    throw new httpErrors.BadRequest('No user specified');
  }

  switch (action) {
    case 'GET': {
      const users = await getAllUsers();

      if (users === null) {
        throw new httpErrors.InternalServerError('Could not get users');
      }

      return {
        user: users
      };
    }
    case 'CREATE': {
      const rawPassword =
        userPayload.password !== undefined && userPayload.password.length > 0 // lgtm [js/insecure-randomness]
          ? userPayload.password
          : generateRandomAlphanumeric(); // lgtm [js/insecure-randomness]

      const createdUser = await createUser({
        email: targetEmail,
        password: await hashPassword(rawPassword),
        adminPassword: rawPassword,
        admin: userPayload.admin ?? false,
        name: userPayload.name ?? '',
        birthdate: userPayload.birthdate ?? '',
        gender: userPayload.gender ?? '',
        eligible: userPayload.eligible ?? true,
        certified: userPayload.certified ?? false,
        chief: userPayload.chief ?? false,
        cohort: userPayload.cohort ?? ''
      });

      if (!createdUser) {
        throw new httpErrors.InternalServerError('Failed to create user: check for duplicate email');
      }

      return {
        user: {
          ...createdUser,
          password: rawPassword
        }
      };
    }
    case 'UPDATE': {
      let updates: Partial<User> = {};

      if (event.middleware.override || event.middleware.user.admin) {
        // Admin can set anything
        updates = userPayload;
      }

      if (userPayload.password !== undefined) {
        // Admin and regular user can update password
        updates.password = await hashPassword(userPayload.password);
      }

      if (userPayload.cohort !== undefined) {
        // Admin and regular users can update cohort
        updates.cohort = userPayload.cohort;
      }

      if (userPayload.gender !== undefined) {
        updates.gender = userPayload.gender;
      }

      const updatedUser = await updateUser(targetEmail, updates);

      if (!updatedUser) {
        throw new httpErrors.InternalServerError('Failed to update user: check for duplicate email');
      }

      if (userPayload.password !== undefined) {
        return {
          user: {
            ...updatedUser,
            password: userPayload.password
          }
        };
      }

      return {
        user: updatedUser
      };
    }
    case 'DELETE': {
      const targetUser = await getUser(targetEmail);

      if (!targetUser) {
        // User does not exist
        throw new httpErrors.NotFound('User does not exist');
      }

      if (event.middleware.override || targetUser.email === event.middleware.user.email) {
        // Admins should not delete themselves
        throw new httpErrors.BadRequest('Cannot delete yourself');
      }

      const deletedUser = await deleteUser(targetUser.email);
      await deleteAvailability({
        user_id: targetUser._id
      });

      if (!deletedUser) {
        throw new httpErrors.InternalServerError('Failed to delete user');
      }

      return {
        user: targetUser
      };
    }
    default: {
      throw new httpErrors.BadRequest('Invalid action');
    }
  }
};

export const handler = middyfy(_handler, {
  authorized: true,
  useMongo: true
});
