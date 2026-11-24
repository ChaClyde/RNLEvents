import AxiosInstance from "./AxiosInstance";

export interface MessengerPerson {
  user_id: number;
  full_name: string;
  position: string | null;
  office: string | null;
  role: string | null;
}

export interface MessengerConversation {
  conversation_id: number;
  person: MessengerPerson | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface MessengerMessage {
  message_id: number;
  sender_user_id: number;
  body: string;
  mine: boolean;
  read_at: string | null;
  created_at: string | null;
}

const MessengerService = {
  users: (search: string) =>
    AxiosInstance.get<{ data: MessengerPerson[] }>("/messenger/users", {
      params: search ? { search } : {},
    }),
  conversations: () =>
    AxiosInstance.get<{ data: MessengerConversation[] }>("/messenger/conversations"),
  open: (userId: number) =>
    AxiosInstance.post<{ data: { conversation_id: number; person: MessengerPerson } }>(
      "/messenger/conversations",
      { user_id: userId },
    ),
  messages: (conversationId: number) =>
    AxiosInstance.get<{
      data: {
        conversation_id: number;
        person: MessengerPerson | null;
        messages: MessengerMessage[];
      };
    }>(`/messenger/conversations/${conversationId}/messages`),
  send: (conversationId: number, body: string) =>
    AxiosInstance.post<{ data: MessengerMessage }>(
      `/messenger/conversations/${conversationId}/messages`,
      { body },
    ),
};

export default MessengerService;
