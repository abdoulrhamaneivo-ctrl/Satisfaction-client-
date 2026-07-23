import { useEffect, useState } from "react";
import { useAuth } from "wasp/client/auth";
import {
  getPaginatedUsers,
  updateIsUserAdminById,
  useQuery,
} from "wasp/client/operations";
import { type User } from "wasp/entities";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../client/components/ui/select";
import { Switch } from "../../../client/components/ui/switch";
import { useDebounce } from "../../../client/hooks/useDebounce";
import { LoadingSpinner } from "../../layout/LoadingSpinner";
import { DropdownEditDelete } from "./DropdownEditDelete";

function AdminSwitch({ id, isAdmin }: Pick<User, "id" | "isAdmin">) {
  const { data: currentUser } = useAuth();
  const isCurrentUser = currentUser?.id === id;

  return (
    <Switch
      checked={isAdmin}
      onCheckedChange={(value) =>
        updateIsUserAdminById({ id: id, isAdmin: value })
      }
      disabled={isCurrentUser}
    />
  );
}

export function UsersTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const [emailFilter, setEmailFilter] = useState<string | undefined>(undefined);
  const [isAdminFilter, setIsAdminFilter] = useState<boolean | undefined>(
    undefined,
  );

  const debouncedEmailFilter = useDebounce(emailFilter, 300);

  const skipPages = currentPage - 1;

  const { data, isLoading } = useQuery(getPaginatedUsers, {
    skipPages,
    filter: {
      ...(debouncedEmailFilter && { emailContains: debouncedEmailFilter }),
      ...(isAdminFilter !== undefined && { isAdmin: isAdminFilter }),
    },
  });

  useEffect(
    function backToPageOne() {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentPage(1);
    },
    [debouncedEmailFilter, isAdminFilter],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border bg-card rounded-sm border shadow-sm">
        <div className="bg-muted/40 flex w-full flex-col items-start justify-between gap-3 p-6">
          <span className="text-sm font-medium">Filters:</span>
          <div className="flex w-full items-center justify-between gap-3 px-2">
            <div className="relative flex items-center gap-3">
              <Label
                htmlFor="email-filter"
                className="text-muted-foreground text-sm"
              >
                email:
              </Label>
              <Input
                type="text"
                id="email-filter"
                placeholder="dude@example.com"
                onChange={(e) => {
                  const value = e.currentTarget.value;
                  setEmailFilter(value === "" ? undefined : value);
                }}
              />
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="admin-filter"
                  className="text-muted-foreground ml-2 text-sm"
                >
                  isAdmin:
                </Label>
                <Select
                  onValueChange={(value) => {
                    if (value === "both") {
                      setIsAdminFilter(undefined);
                    } else {
                      setIsAdminFilter(value === "true");
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="both" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">both</SelectItem>
                    <SelectItem value="true">true</SelectItem>
                    <SelectItem value="false">false</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {data?.totalPages && (
              <div className="flex max-w-60 flex-row items-center">
                <span className="text-md text-foreground mr-2">page</span>
                <Input
                  type="number"
                  min={1}
                  defaultValue={currentPage}
                  max={data?.totalPages}
                  onChange={(e) => {
                    const value = parseInt(e.currentTarget.value);
                    if (
                      data?.totalPages &&
                      value <= data?.totalPages &&
                      value > 0
                    ) {
                      setCurrentPage(value);
                    }
                  }}
                  className="w-20"
                />
                <span className="text-md text-foreground">
                  {" "}
                  /{data?.totalPages}{" "}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="border-border py-4.5 grid grid-cols-9 border-t-4 px-4 md:px-6">
          <div className="col-span-4 flex items-center">
            <p className="font-medium">Email / Username</p>
          </div>
          <div className="col-span-3 flex items-center">
            <p className="font-medium">Rôle</p>
          </div>
          <div className="col-span-1 flex items-center">
            <p className="font-medium">Is Admin</p>
          </div>
          <div className="col-span-1 flex items-center">
            <p className="font-medium"></p>
          </div>
        </div>
        {isLoading && <LoadingSpinner />}
        {!!data?.users &&
          data?.users?.length > 0 &&
          data.users.map((user) => (
            <div
              key={user.id}
              className="py-4.5 grid grid-cols-9 gap-4 px-4 md:px-6"
            >
              <div className="col-span-4 flex items-center">
                <div className="flex flex-col gap-1">
                  <p className="text-foreground text-sm">{user.email}</p>
                  <p className="text-foreground text-sm">{user.username}</p>
                </div>
              </div>
              <div className="col-span-3 flex items-center">
                <p className="text-foreground text-sm">{user.role}</p>
              </div>
              <div className="col-span-1 flex items-center">
                <div className="text-foreground text-sm">
                  <AdminSwitch {...user} />
                </div>
              </div>
              <div className="col-span-1 flex items-center">
                <DropdownEditDelete />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
