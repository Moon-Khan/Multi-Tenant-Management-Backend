export interface IApiResponse<T = unknown> {
  status: number
  msg: string
  data: T
}
