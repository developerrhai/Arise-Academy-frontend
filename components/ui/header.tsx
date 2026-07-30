import { Phone } from 'lucide-react';
import logo from '../../public/logo.jpeg';

export const Header = () => {
    return (

        <div className="relative overflow-hidden flex flex-col md:flex-row items-center gap-8 bg-gradient-to-br from-[#0b3d6b] via-[#0d5c9e] to-[#0b7abf]  text-white shadow-xl rounded-xl">

            {/* <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div> */}

            {/* <div className="shrink-0 transition-transform hover:scale-105 duration-300"> */}
                <img
                    src={logo.src}
                    alt="Vidyaaniketan Logo"
                    className=" object-contain drop-shadow-2xl"
                />
            {/* </div> */}

            
        </div>
    )
}