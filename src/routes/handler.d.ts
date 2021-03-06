import { Handler, Callback } from 'aws-lambda';
import { UserWithoutPassword } from '../models/user.d';

export type HTTPRawHandler<
  BodyPayload = null,
  QueryPayload = null,
  PathPayload = null,
  ResultPayload = undefined
> = Handler<HTTPUnknownEvent<BodyPayload, QueryPayload, PathPayload>, HTTPRawResult<ResultPayload>>;

export type HTTPRawCallback = Callback<HTTPRawResult>;

export type HTTPRawResult<DataPayload = undefined> = DataPayload;

export type HTTPUnknownEvent<BodyPayload = null, QueryPayload = null, PathPayload = null> =
  | HTTPUnauthorizedEvent<BodyPayload, QueryPayload, PathPayload>
  | HTTPAuthorizedEvent<BodyPayload, QueryPayload, PathPayload>
  | HTTPAdminEvent<BodyPayload, QueryPayload, PathPayload>;

export type HTTPUnauthorizedEvent<BodyPayload, QueryPayload, PathPayload> = EventBase<
  {
    authorized: false;
    override: false;
    user: null;
  },
  BodyPayload,
  QueryPayload,
  PathPayload
>;

export type HTTPAuthorizedEvent<BodyPayload, QueryPayload, PathPayload> = EventBase<
  {
    authorized: true;
    override: false;
    user: UserWithoutPassword;
  },
  BodyPayload,
  QueryPayload,
  PathPayload
>;

export type HTTPAdminEvent<BodyPayload, QueryPayload, PathPayload> = EventBase<
  {
    authorized: false;
    override: true;
    user: null;
  },
  BodyPayload,
  QueryPayload,
  PathPayload
>;

export interface EventBase<MiddlewarePayload, BodyPayload, QueryPayload, PathPayload> {
  body: BodyPayload;
  headers: { [name: string]: any };
  multiValueHeaders: { [name: string]: any };
  httpMethod: string;
  isBase64Encoded: boolean;
  path: string;
  pathParameters: PathPayload;
  queryStringParameters: QueryPayload;
  multiValueQueryStringParameters: { [name: string]: string[] } | null;

  middleware: MiddlewarePayload;
}
