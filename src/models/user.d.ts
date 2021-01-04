import { ObjectID } from 'mongodb';

export interface User {
  _id: ObjectID;
  email: string;
  password: string;
  admin: boolean;
  name: string;
  birthdate: string;
  certified: boolean;
  availability: UserAvailability[];
}

export interface UserAvailability {
  date: string;
}
