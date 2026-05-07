import { createApi, type BaseQueryFn } from "@reduxjs/toolkit/query/react"
import type { AxiosError, AxiosRequestConfig } from "axios"
import { apiClient } from "@/lib/api-client"
import { reset, setAccessToken, setUser } from "./auth-slice"
import type { User } from "@/lib/auth/types"

interface AxiosBaseQueryArgs {
  url: string
  method?: AxiosRequestConfig["method"]
  data?: AxiosRequestConfig["data"]
  params?: AxiosRequestConfig["params"]
}

interface AxiosBaseQueryError {
  status?: number
  data: unknown
}

const axiosBaseQuery: BaseQueryFn<
  AxiosBaseQueryArgs,
  unknown,
  AxiosBaseQueryError
> = async ({ url, method = "GET", data, params }) => {
  try {
    const result = await apiClient({ url, method, data, params })
    return { data: result.data }
  } catch (axiosError) {
    const err = axiosError as AxiosError
    return {
      error: {
        status: err.response?.status,
        data: err.response?.data ?? err.message,
      },
    }
  }
}

interface LoginData {
  email: string
  password: string
}

interface RegisterData {
  firstName: string
  lastName: string
  email: string
  password: string
}

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: axiosBaseQuery,
  tagTypes: ["User"],
  endpoints: (builder) => ({
    login: builder.mutation<{ accessToken: string }, LoginData>({
      query: (data) => ({ url: "/auth/login", method: "POST", data }),
      invalidatesTags: ["User"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(setAccessToken(data.accessToken))
        } catch {
          // error surfaces to caller via .unwrap()
        }
      },
    }),
    register: builder.mutation<{ message: string }, RegisterData>({
      query: (data) => ({ url: "/auth/register", method: "POST", data }),
    }),
    logout: builder.mutation<unknown, void>({
      query: () => ({ url: "/auth/logout", method: "GET" }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled
        } catch {
          // logout should clear local state regardless of server outcome
        }
        dispatch(reset())
        dispatch(authApi.util.resetApiState())
      },
    }),
    getUser: builder.query<User, void>({
      query: () => ({ url: "/auth/get-user", method: "GET" }),
      transformResponse: (response: { user: User }) => response.user,
      providesTags: ["User"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(setUser(data))
        } catch {
          // ignore — protected layout handles unauthenticated state
        }
      },
    }),
  }),
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetUserQuery,
} = authApi
