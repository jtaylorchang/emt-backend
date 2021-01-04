import httpErrors from 'http-errors';

import middyfy from '../../middleware';
import { HTTPRawHandler } from '../handler';

import { createUser, deleteUser, getUser, updateUser } from '../../models/user';
import { hashPassword } from '../../utils/auth';
import { User } from '../../models/user.d';

/**
 * Manage users: create, delete, update
 */
const _handler: HTTPRawHandler<
  {
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    targetEmail: string;
    userPayload: Partial<User>;
  },
  {},
  {},
  {
    user?: Omit<User, 'password'>;
  }
> = async (event) => {
  if (!event.middleware.authorized || !event.middleware.user.admin) {
    throw new httpErrors.Unauthorized('Not authorized');
  }

  const { action, userPayload } = event.body;

  if (!event.body.targetEmail) {
    throw new httpErrors.BadRequest('No user specified');
  }

  switch (action) {
    case 'CREATE': {
      const rawPassword = userPayload.password ?? 'TODO';

      const createdUser = await createUser({
        email: event.body.targetEmail,
        password: await hashPassword(rawPassword),
        admin: userPayload.admin ?? false,
        name: userPayload.name ?? '',
        birthdate: userPayload.birthdate ?? '',
        certified: userPayload.certified ?? false,
        availability: userPayload.availability ?? []
      });

      if (!createdUser) {
        throw new httpErrors.InternalServerError('Failed to create user');
      }

      return {
        message: 'Success',
        data: {
          user: {
            ...createdUser,
            password: rawPassword
          }
        }
      };
    }
    case 'UPDATE': {
      const updatedUser = await updateUser(event.body.targetEmail, userPayload);

      if (!updatedUser) {
        throw new httpErrors.InternalServerError('Failed to update user');
      }

      return {
        message: 'Success',
        data: {
          user: updatedUser
        }
      };
    }
    case 'DELETE': {
      const targetUser = await getUser(event.body.targetEmail);

      if (!targetUser) {
        // User does not exist, pretend user was deleted
        return {
          message: 'Success',
          data: {}
        };
      }

      if (targetUser.email === event.middleware.user.email) {
        // Admins should not delete themselves
        throw new httpErrors.BadRequest('Cannot delete yourself');
      }

      const deletedUser = await deleteUser(targetUser.email);

      if (!deletedUser) {
        throw new httpErrors.InternalServerError('Failed to delete user');
      }

      return {
        message: 'Success',
        data: {}
      };
    }
    default: {
      throw new httpErrors.BadRequest('Missing action');
    }
  }

  return {
    message: 'Success',
    data: {
      user: undefined
    }
  };
};

export const handler = middyfy(_handler, {
  authorized: true,
  useMongo: true
});