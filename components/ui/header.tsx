import Image from 'next/image';

export const Header = () => {
    return (
        <div className="relative overflow-hidden flex flex-col md:flex-row items-center gap-8 bg-gradient-to-br from-[#0b3d6b] via-[#0d5c9e] to-[#0b7abf] text-white shadow-xl rounded-xl">
            <Image
                src="/arise-logo.png"
                alt="Arise Academy Logo"
                width={200}
                height={200}
                className="object-contain drop-shadow-2xl"
            />
        </div>
    )
}