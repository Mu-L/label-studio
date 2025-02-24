import { type FormEventHandler, useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { InputFile, ToastType, useToast } from "@humansignal/ui";
import { API } from "apps/labelstudio/src/providers/ApiProvider";
import styles from "../AccountSettings.module.scss";
import { useCurrentUserAtom } from "@humansignal/core/lib/hooks/useCurrentUser";
import { atomWithMutation } from "jotai-tanstack-query";
import { useAtomValue } from "jotai";

/**
 * FIXME: This is legacy imports. We're not supposed to use such statements
 * each one of these eventually has to be migrated to core or ui
 */
import { Input } from "/apps/labelstudio/src/components/Form/Elements";
import { Userpic } from "/apps/labelstudio/src/components/Userpic/Userpic";
import { Button } from "/apps/labelstudio/src/components/Button/Button";

const updateUserAvatarAtom = atomWithMutation(() => ({
  mutationKey: ["update-user"],
  async mutationFn({
    userId,
    body,
    isDelete,
  }: { userId: number; body: FormData; isDelete?: never } | { userId: number; isDelete: true; body?: never }) {
    const method = isDelete ? "deleteUserAvatar" : "updateUserAvatar";
    const response = await API.invoke(
      method,
      {
        pk: userId,
      },
      {
        body,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        errorFilter: () => true,
      },
    );
    return response;
  },
}));

export const PersonalInfo = () => {
  const toast = useToast();
  const { user, fetch: refetchUser, isInProgress: userInProgress, updateAsync: updateUser } = useCurrentUserAtom();
  const updateUserAvatar = useAtomValue(updateUserAvatarAtom);
  const [isInProgress, setIsInProgress] = useState(false);
  const avatarRef = useRef<HTMLInputElement>();
  const fileChangeHandler: FormEventHandler<HTMLInputElement> = useCallback(
    async (e) => {
      if (!user) return;

      const input = e.currentTarget as HTMLInputElement;
      const body = new FormData();
      body.append("avatar", input.files?.[0] ?? "");
      const response = await updateUserAvatar.mutateAsync({
        body,
        userId: user.id,
      });

      if (!response.$meta.ok) {
        toast.show({ message: response?.response?.detail ?? "Error updating avatar", type: ToastType.error });
      } else {
        refetchUser();
      }
      input.value = "";
    },
    [user?.id],
  );

  const deleteUserAvatar = async () => {
    if (!user) return;
    await updateUserAvatar.mutateAsync({ userId: user.id, isDelete: true });
    refetchUser();
  };

  const userFormSubmitHandler: FormEventHandler = useCallback(
    async (e) => {
      e.preventDefault();
      if (!user) return;
      const body = new FormData(e.currentTarget as HTMLFormElement);
      const json = Object.fromEntries(body.entries());
      const response = await updateUser(json);

      refetchUser();
      if (!response?.$meta.ok) {
        toast.show({ message: response?.response?.detail ?? "Error updating user", type: ToastType.error });
      }
    },
    [user?.id],
  );

  useEffect(() => setIsInProgress(userInProgress), [userInProgress]);

  return (
    <div className={styles.section} id="personal-info">
      <div className={styles.sectionContent}>
        <div className={styles.flexRow}>
          <Userpic user={user} isInProgress={userInProgress} size={92} style={{ flex: "none" }} />
          <form className={styles.flex1}>
            <InputFile
              name="avatar"
              onChange={fileChangeHandler}
              accept="image/png, image/jpeg, image/jpg"
              ref={avatarRef}
            />
          </form>
          {user?.avatar && (
            <Button type="submit" look="danger" onClick={deleteUserAvatar}>
              Delete
            </Button>
          )}
        </div>
        <form onSubmit={userFormSubmitHandler} className={styles.sectionContent}>
          <div className={styles.flexRow}>
            <div className={styles.flex1}>
              <Input label="First Name" value={user?.first_name} name="first_name" />
            </div>
            <div className={styles.flex1}>
              <Input label="Last Name" value={user?.last_name} name="last_name" />
            </div>
          </div>
          <div className={styles.flexRow}>
            <div className={styles.flex1}>
              <Input label="E-mail" type="email" readOnly={true} value={user?.email} />
            </div>
            <div className={styles.flex1}>
              <Input label="Phone" type="phone" value={user?.phone} name="phone" />
            </div>
          </div>
          <div className={clsx(styles.flexRow, styles.flexEnd)}>
            <Button look="primary" style={{ width: 125 }} waiting={isInProgress}>
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
