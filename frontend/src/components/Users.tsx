import { useEffect,useState } from "react"
import axios from "axios"
import {User} from './User'
interface UserType {
    _id: string;
    firstName: string;
    lastName: string;
}
export const Users=()=>{
    const [filter, setFilter]=useState("");
    const [users, setUsers] = useState<UserType[]>([]);
    useEffect(() => {
    async function fetchUsers() {
        try {
            const response = await axios.get(
                `http://localhost:3000/api/v1/user/bulk?filter=${filter}`,
                {
                    headers: {
                        Authorization:
                            "Bearer " + localStorage.getItem("token")
                    }
                }
            );

            setUsers(response.data.user);

        } catch (err) {
            console.log(err);
        }
    }

    fetchUsers();

}, [filter]);
    return  <div>
            <div className="font-bold mt-6 text-lg">
                Users
            </div>

            <div className="my-2">


                <input
                    onChange={(e) => {
                        setFilter(e.target.value);
                    }}
                  type="text"
                  placeholder="Search users..."
                  className="w-full mt-6 border border-slate-300 rounded-xl px-5 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                
            </div>

            <div>
                {users.length > 0 ? (
    users.map((user) => (
        <User key={user._id} user={user} />
    ))
) : (
    <div className="text-center py-10">
        <h2 className="text-xl font-semibold text-slate-600">
            🔍 No users found
        </h2>

        <p className="text-slate-500 mt-2">
            Try searching with another name.
        </p>
    </div>
)}
            </div>
        </div>
}