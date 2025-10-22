export default function ProfileSection() {
  return (
    <section className="flex flex-col items-start w-[887px] h-[771px] p-[26px] bg-[#0A0A0A] text-[#F1F5F9]">
      <div className="flex flex-col items-start w-[835px] h-[719px] gap-[26px]">
        {/* Heading + subheading */}
        <div className="flex flex-col items-start w-[835px] h-[70px] gap-[4px] relative">
          <div className="h-[39px] w-[835px] relative">
            <h1 className="absolute left-0 top-0 font-medium text-[26px] leading-[39px] tracking-[0px]">
              Profile
            </h1>
          </div>
          <div className="h-[26px] w-[835px] relative">
            <p className="absolute left-0 top-0 text-[17px] leading-[26px] tracking-[0px] text-[#A1A1AA]">
              Manage your personal information
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="relative w-[835px] h-[623px] bg-[#1A1A1A] border border-[#404040] rounded-[13px]">
          {/* Card header */}
          <div className="absolute left-[27px] top-[27px] w-[780px] h-[35px] flex items-start justify-between">
            <h2 className="text-[17px] leading-[17px] tracking-[0px]">
              Personal Information
            </h2>
            <div className="inline-flex items-center justify-center h-[35px] px-[13px] gap-[7px] bg-[#F87171] rounded-[7px]">
              <span className="text-[15px] leading-[22px] tracking-[0px] text-white">
                Edit Profile
              </span>
            </div>
          </div>

          {/* Card content */}
          <div className="absolute left-[1px] top-[95px] w-[832px] h-[527px] px-[26px] flex flex-col gap-[26px]">
            {/* Top profile row with avatar */}
            <div className="w-[780px] h-[167px] border-b border-[#404040] relative">
              <div className="absolute left-[320px] top-0 w-[140px] h-[140px] flex">
                <div className="flex items-center justify-center w-[140px] h-[140px] bg-[#262626] rounded-full">
                  {/* avatar initials */}
                  <span className="text-[26px] leading-[35px]">JD</span>
                </div>
              </div>
            </div>

            {/* Fields grid (2x2) */}
            <div className="w-[780px] h-[179px] relative">
              {/* Name */}
              <div className="absolute left-0 top-0 w-[377px] h-[76px] flex flex-col gap-[9px]">
                <div className="h-[15px] flex items-center gap-[9px] text-[15px] leading-[15px] tracking-[0px]">
                  Name
                </div>
                <div className="h-[52px] w-[377px] bg-[#262626] rounded-[7px] pl-[13px] flex items-center gap-[13px]">
                  {/* icon placeholder */}
                  <div className="w-[17px] h-[17px] border border-[#A1A1AA] rounded-[2px]" />
                  <span className="text-[17px] leading-[26px] tracking-[0px]">
                    James Duong
                  </span>
                </div>
              </div>

              {/* ID */}
              <div className="absolute left-[403px] top-0 w-[377px] h-[76px] flex flex-col gap-[9px]">
                <div className="h-[15px] flex items-center gap-[9px] text-[15px] leading-[15px] tracking-[0px]">
                  ID
                </div>
                <div className="h-[52px] w-[377px] bg-[#262626] rounded-[7px] pl-[13px] flex items-center gap-[13px]">
                  <span className="text-[15px] leading-[22px] tracking-[0px] text-[#A1A1AA]">
                    ID:
                  </span>
                  <span className="text-[17px] leading-[26px] tracking-[0px]">
                    828225756
                  </span>
                </div>
              </div>

              {/* Email */}
              <div className="absolute left-0 top-[103px] w-[377px] h-[76px] flex flex-col gap-[9px]">
                <div className="h-[15px] flex items-center gap-[9px] text-[15px] leading-[15px] tracking-[0px]">
                  Email
                </div>
                <div className="h-[52px] w-[377px] bg-[#262626] rounded-[7px] pl-[13px] flex items-center gap-[13px]">
                  {/* icon placeholder */}
                  <div className="w-[17px] h-[17px] border border-[#A1A1AA] rounded-[2px]" />
                  <span className="text-[17px] leading-[26px] tracking-[0px]">
                    jduong7524@sdsu.edu
                  </span>
                </div>
              </div>

              {/* Contact */}
              <div className="absolute left-[403px] top-[103px] w-[377px] h-[76px] flex flex-col gap-[9px]">
                <div className="h-[15px] flex items-center gap-[9px] text-[15px] leading-[15px] tracking-[0px]">
                  Contact
                </div>
                <div className="h-[52px] w-[377px] bg-[#262626] rounded-[7px] pl-[13px] flex items-center gap-[13px]">
                  {/* icon placeholder */}
                  <div className="w-[17px] h-[17px] border border-[#A1A1AA] rounded-[2px]" />
                  <span className="text-[17px] leading-[26px] tracking-[0px]">
                    +1 (XXX) XXX-XXXX
                  </span>
                </div>
              </div>
            </div>

            {/* Biography */}
            <div className="flex flex-col items-start w-[780px] h-[103px] gap-[9px]">
              <div className="h-[15px] w-[780px] text-[15px] leading-[15px] tracking-[0px]">
                Biography
              </div>
              <div className="w-[780px] h-[79px] bg-[#262626] rounded-[7px] pt-[13px] pl-[13px]">
                <p className="w-[754px] text-[17px] leading-[26px] tracking-[0px]">
                  Lorem ipsum dolor sit amet consectetur adipiscing elit. Sit
                  amet consectetur adipiscing elit quisque faucibus ex.
                  Adipiscing elit quisque faucibus ex sapien vitae pellentesque.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
